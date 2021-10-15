import {
  CloseOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Button, Space } from 'antd';
import { Confirm, TabPane, Tabs as TabsComponent } from 'app/components';
import { selectOrgId } from 'app/pages/MainPage/slice/selectors';
import React, { memo, useCallback, useContext, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import styled, { css } from 'styled-components/macro';
import { ORANGE, STICKY_LEVEL } from 'styles/StyleConstants';
import { ViewViewModelStages } from '../constants';
import { EditorContext } from '../EditorContext';
import {
  selectCurrentEditingViewAttr,
  selectEditingViews,
} from '../slice/selectors';
import { removeEditingView, runSql } from '../slice/thunks';
import { ViewViewModel } from '../slice/types';

const errorColor = css`
  color: ${p => p.theme.error};
`;

export const Tabs = memo(() => {
  const [operatingView, setOperatingView] = useState<null | ViewViewModel>(
    null,
  );
  const [confirmVisible, setConfirmVisible] = useState(false);
  const dispatch = useDispatch();
  const history = useHistory();
  const { editorInstance } = useContext(EditorContext);
  const orgId = useSelector(selectOrgId);
  const editingViews = useSelector(selectEditingViews);
  const id = useSelector(state =>
    selectCurrentEditingViewAttr(state, { name: 'id' }),
  ) as string;

  const redirect = useCallback(
    currentEditingViewKey => {
      if (currentEditingViewKey) {
        history.push(`/organizations/${orgId}/views/${currentEditingViewKey}`);
      } else {
        history.push(`/organizations/${orgId}/views`);
      }
    },
    [history, orgId],
  );

  const tabChange = useCallback(
    activeKey => {
      if (id !== activeKey) {
        history.push(`/organizations/${orgId}/views/${activeKey}`);
      }
    },
    [history, id, orgId],
  );

  const tabEdit = useCallback(
    (targetKey, action) => {
      const view = editingViews.find(v => v.id === targetKey);

      switch (action) {
        case 'remove':
          if (view!.touched === false) {
            dispatch(removeEditingView({ id: targetKey, resolve: redirect }));
          } else {
            setOperatingView(view!);
            setConfirmVisible(true);
          }
          break;
        default:
          break;
      }
    },
    [dispatch, editingViews, redirect],
  );

  const hideConfirm = useCallback(() => {
    setConfirmVisible(false);
  }, []);

  const removeTab = useCallback(() => {
    dispatch(removeEditingView({ id: operatingView!.id, resolve: redirect }));
    setConfirmVisible(false);
  }, [dispatch, operatingView, redirect]);

  const runTab = useCallback(() => {
    const fragment = editorInstance
      ?.getModel()
      ?.getValueInRange(editorInstance.getSelection()!);
    setConfirmVisible(false);
    dispatch(runSql({ id, isFragment: !!fragment }));
  }, [dispatch, id, editorInstance]);

  return (
    <Wrapper>
      <TabsComponent
        hideAdd
        type="editable-card"
        activeKey={id}
        onChange={tabChange}
        onEdit={tabEdit}
      >
        {editingViews.map(({ id, name, touched, stage, error }) => (
          <TabPane
            key={id}
            tab={error ? <span css={errorColor}>{name}</span> : name}
            closeIcon={
              <CloseIcon touched={touched} stage={stage} error={!!error} />
            }
          />
        ))}
      </TabsComponent>
      <Confirm
        visible={confirmVisible}
        title={`${operatingView?.name} 中有未执行的修改，是否执行？`}
        icon={
          <InfoCircleOutlined
            css={`
              color: ${ORANGE};
            `}
          />
        }
        footer={
          <Space>
            <Button onClick={removeTab}>放弃</Button>
            <Button onClick={hideConfirm}>取消</Button>
            <Button onClick={runTab} type="primary">
              执行
            </Button>
          </Space>
        }
      />
    </Wrapper>
  );
});

interface CloseIconProps {
  touched: boolean;
  stage: ViewViewModelStages;
  error: boolean;
}

function CloseIcon({ touched, stage, error }: CloseIconProps) {
  const [hovering, setHovering] = useState(false);

  const onEnter = useCallback(() => {
    setHovering(true);
  }, []);

  const onLeave = useCallback(() => {
    setHovering(false);
  }, []);

  let icon;

  switch (stage) {
    case ViewViewModelStages.Loading:
    case ViewViewModelStages.Running:
    case ViewViewModelStages.Saving:
      icon = <LoadingOutlined />;
      break;
    default:
      if (!hovering) {
        if (error) {
          icon = <InfoCircleOutlined css={errorColor} />;
        } else if (touched) {
          icon = <Editing />;
        } else {
          icon = <CloseOutlined />;
        }
      } else {
        icon = <CloseOutlined />;
      }

      break;
  }

  return (
    <CloseIconWrapper onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {icon}
    </CloseIconWrapper>
  );
}

const Wrapper = styled.div`
  z-index: ${STICKY_LEVEL};
  flex-shrink: 0;
`;

const CloseIconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
`;

const Editing = styled.span`
  display: block;
  width: 10px;
  height: 10px;
  background-color: ${p => p.theme.textColorLight};
  border-radius: 50%;
`;