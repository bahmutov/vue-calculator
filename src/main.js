import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false
// if (window.Cypress) {
//   Vue.config.errorHandler = function (err, vm, info) {
//     console.error(err)
//     console.error(vm)
//     console.error(info)
//     // ? why can't the test fail here?
//     Cypress.cy.fail(err)
//   }
// }

new Vue({
  render: h => h(App),
}).$mount('#app')
