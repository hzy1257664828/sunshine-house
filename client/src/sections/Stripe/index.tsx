import React, { useEffect, useRef } from "react";
import { useMutation } from "@apollo/react-hooks";
import { Layout, Spin } from "antd";
import { Redirect, RouteComponentProps } from "react-router-dom";
import { CONNECT_STRIPE } from "../../lib/graphql/mutations";
import {
  ConnectStripe as ConnectStripeData,
  ConnectStripeVariables
} from "../../lib/graphql/mutations/ConnectStripe/__generated__/ConnectStripe";
import { Viewer } from "../../lib/types";
import { displaySuccessNotification } from "../../lib/utils";


const { Content } = Layout;
interface Props {
  viewer: Viewer;
  setViewer: (viewer: Viewer) => void;
}

export const Stripe = ({ viewer, setViewer, history }: Props & RouteComponentProps) => {
  const [connectStripe, { data, loading, error }] = useMutation<
    ConnectStripeData,
    ConnectStripeVariables
  >(CONNECT_STRIPE, {
    onCompleted: data => {
      if (data && data.connectStripe) {
        setViewer({ ...viewer, hasWallet: data.connectStripe.hasWallet });
        displaySuccessNotification(
          "你成功连接了Stripe账户",
          "你现在可以开始创建清单了"
        );
      }
    }
  });
  const connectStripeRef = useRef(connectStripe);

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get("code");

    if (code) {
      connectStripeRef.current({
        variables: {
          input: { code }
        }
      });
    } else {
      history.replace("/login");
    }
  }, [history]);

  if (data && data.connectStripe) {
    return <Redirect to={`/user/${viewer.id}`} />;
  }

  if (loading) {
    return (
      <Content className="stripe">
        <Spin size="large" tip="连接你的Stripe中..." />
      </Content>
    );
  }

  // 重定向
  if (error) {
    return <Redirect to={`/user/${viewer.id}?stripe_error=true`} />;
  }

  return null;
};