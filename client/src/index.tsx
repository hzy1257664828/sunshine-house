import React, {useState, useEffect, useRef} from "react";
import {ApolloProvider, useMutation} from "@apollo/react-hooks";
import ApolloClient from "apollo-boost";
import {render} from "react-dom";
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";
import {
  Home,
  WrappedHost as Host,
  Listing,
  Listings,
  User,
  NotFound,
  AppHeader, Stripe,
} from "./sections";
import * as serviceWorker from "./serviceWorker";
import "./styles/index.css";
import {Login} from "./sections/Login";
import {Layout, Affix, Spin} from "antd";
import {AppHeaderSkeleton, ErrorBanner} from "./lib/components";
import {Viewer} from "./lib/types";
import {LOG_IN} from "./lib/graphql/mutations";
import {
  LogIn as LogInData,
  LogInVariables,
} from "./lib/graphql/mutations/LogIn/__generated__/LogIn";
import {StripeProvider, Elements} from "react-stripe-elements";


/**
 * 对每次请求做拦截，增加 “X-CSRF-TOKEN” 字段，使用用户的唯一标识 
 */
const client = new ApolloClient({
  uri: "/api",
  request: async operation => {
    const token = sessionStorage.getItem('token');
    operation.setContext({
      headers: {
        "X-CSRF-TOKEN": token || ""
      }
    })
  }
});

const initialViewer: Viewer = {
  id: null,
  token: null,
  avatar: null,
  hasWallet: null,
  didRequest: false,
};

// 用于存储登录状态
const App = () => {
  // 由于initialViewer定义了类型，所以不需要给useState再加类型
  const [viewer, setViewer] = useState(initialViewer);
  /**
   * useMutation执行后返回的元祖包括：
   *
   * - A mutate function that you can call at any time to execute the mutation
   * - An object with fields that represent the current status of the mutation's execution
   *
   * https://www.apollographql.com/docs/react/data/mutations/
   * */

  const [logIn, {error}] = useMutation<LogInData, LogInVariables>(LOG_IN, {
    onCompleted: (data) => {
      if (data && data.logIn) {
        // 当logIn执行成功后，判断是否存在logIn对象（里面保存了viewer对象）
        setViewer(data.logIn);
        if (data && data.logIn.token) {
          sessionStorage.setItem('token', data.logIn.token)
        } else {
          sessionStorage.removeItem('token');
        }
      }
    },
  });
  const logInRef = useRef(logIn);
  useEffect(() => {
    logInRef.current();
  }, []);
  if (!viewer.didRequest && !error) {
    return (
      <Layout className="app-skeleton">
        <AppHeaderSkeleton/>
        <div className="app-skeleton__spin-section">
          <Spin size="large" tip="正在加载！"/>
        </div>
      </Layout>
    );
  }
  const logInErrorBannerElement = error ? (
    <ErrorBanner description="无法验证您已经登录，请再次手动登录！"/>
  ) : null;  
  return (
    <StripeProvider apiKey={process.env.REACT_APP_S_PUBLISHABLE_KEY as string}>
      <Router>
        <Layout id="app">
          {logInErrorBannerElement}
          <Affix offsetTop={0} className="app__affix-header">            
            <AppHeader viewer={viewer} setViewer={setViewer}/>
          </Affix>
          <Switch>
            <Route exact path="/" component={Home}></Route>
            <Route exact path="/host" render={props => <Host {...props} viewer={viewer}/>}/>
            <Route
              exact
              path="/login"
              render={(props) => <Login {...props} setViewer={setViewer}/>}
            />
            <Route
              exact
              path="/stripe"
              render={props => <Stripe {...props} viewer={viewer} setViewer={setViewer}/>}
            />
            {/* 
              订单页面，需要使用Spripe HOC来传递支付控件
            */}
            <Route
              exact
              path="/listing/:id"
              render={props => (
                <Elements>
                  <Listing {...props} viewer={viewer} />
                </Elements>
              )}
            />            
            <Route exact path="/listings/:location?" component={Listings}/>
            <Route
              exact
              path="/user/:id"
              render={props => <User {...props} viewer={viewer} setViewer={setViewer}/>}
            />
            <Route exact path="/user/:id" render={props => <User {...props} viewer={viewer} setViewer={setViewer}/>}/>
            <Route component={NotFound}/>
          </Switch>
        </Layout>
      </Router>
    </StripeProvider>
  );
};

// ApolloProvider 就是一个React Context，将client从根组件向下一路传递！
// 可以理解成redux
render(
  <ApolloProvider client={client}>
    <App/>
  </ApolloProvider>,
  document.getElementById("root")
);

serviceWorker.unregister();