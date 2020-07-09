import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

// exclude these lines from code coverage
/* istanbul ignore next */
if (window.Cypress) {
  // send any errors caught by the Vue handler
  // to the Cypress top level error handler to fail the test
  // https://github.com/cypress-io/cypress/issues/7910
  Vue.config.errorHandler = window.top.onerror
}

new Vue({
  render: h => h(App),
}).$mount('#app')
