/**
 * Copyright (c) Jalal Maskoun.
 *
 * This source code is licensed under the AGPL3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import { ComponentBasedEvent, ContainerBasedEvent } from "./lists";
import Restricted from "./restrictions";
import TodoList from "./todo";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/restricted">
          <Restricted />
        </Route>
        <Route path="/todo">
          <TodoList />
        </Route>
        <Route path="/component-based-event">
          <ComponentBasedEvent />
        </Route>
        <Route path="/">
          <ContainerBasedEvent />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;