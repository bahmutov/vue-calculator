title: Code Coverage for Vue Applications
author: Gleb Bahmutov
authorTwitter: @bahmutov
tags: vue.js, code coverage
---

Let's take a Vue application scaffolded with Vue CLI like this [vue-calculator](https://github.com/bahmutov/vue-calculator). The application uses Babel to transpile source files, which makes it very flexible. In this blog post, I will show how to instrument the application's source code on the fly to collect code coverage information. We then will use the code coverage reports to guide end-to-end test writing.

## Instrument source code

By default, the code is transformed using the following `babel.config.js` file

```js
// babel.config.js
module.exports = {
  presets: [
    '@vue/app'
  ]
}
```

When we start the application with `npm run serve`, we execute the NPM script

```json
{
  "scripts": {
    "serve": "vue-cli-service serve"
  }
}
```

The application runs at port 8080 by default.

![Vue calculator application](./images/calculator.png)

We can instrument the application code by inserting [babel-plugin-istanbul](https://github.com/istanbuljs/babel-plugin-istanbul) into Babel config.

```js
// babel.config.js
module.exports = {
  presets: [
    '@vue/app'
  ],
  plugins: [
    'babel-plugin-istanbul'
  ]
}
```

The application runs, and now we can find `window.__coverage__` object with counters for every statement, every function, and every branch for every file.

![Application coverage object](./images/coverage.png)

Except the coverage object includes a single entry `src/main.js`, and is missing `src/App.vue` and `src/components/Calculator.vue` files.

Let's tell `babel-plugin-istanbul` that we want to instrument both `.js` and `.vue` files.

```js
// babel.config.js
module.exports = {
  presets: [
    '@vue/app'
  ],
  plugins: [
    ['babel-plugin-istanbul', {
      extension: ['.js', '.vue']
    }]
  ]
}
```

**Tip:** we can place `istanbul` settings in a separate file `.nycrc`, or add them to `package.json`. For now, let's just keep the settings with the plugin.

When we restart the application, we get a new `window.__coverage__` object with entries for `.js` and for `.vue` files.

![Instrumented JS and Vue files](./images/vue-covered.png)

## Conditional instrumentation

If you look at the application's bundle, you will see what the instrumentation does. It inserts counters around every statement, keeping track how many times a statement was executed. There are separate counters for every function and every branch path.

![Instrumented source code](./images/instrumented.png)

We do not want to instrument the production code. Let's only instrument the code when `NODE_ENV=test` since we will use the collected code coverage to help us write better tests.

```js
// babel.config.js
const plugins = []
if (process.env.NODE_ENV === 'test') {
  plugins.push([
    "babel-plugin-istanbul", {
      // specify some options for NYC instrumentation here
      // like tell it to instrument both JavaScript and Vue files
      extension: ['.js', '.vue'],
    }
  ])
}
module.exports = {
  presets: [
    '@vue/app'
  ],
  plugins
}
```

We can start the application with instrumentation by setting the environment variable.

```shell
$ NODE_ENV=test npm run serve
```

**Tip:** for cross-platform portability use [cross-env](https://github.com/kentcdodds/cross-env) utility to set an environment variable.

## End-to-end Tests

Now that we have instrumented our source code, let us it to guide writing tests. I will install Cypress Test Runner plus its [code coverage plugin](https://github.com/cypress-io/code-coverage) that will convert the coverage objects into human and machine readable reports at the end of the test run. I will also install a handy utility for starting the application, running tests, and shutting down the app afterwards called [start-server-and-test](https://github.com/bahmutov/start-server-and-test).

```shell
$ npm i -D cypress @cypress/code-coverage start-server-and-test
```

**Note:** you can install Cypress using Vue CLI plugin [@vue/cli-plugin-e2e-cypress](https://cli.vuejs.org/core-plugins/e2e-cypress.html), but I prefer to install the latest Cypress version.

In the folder `cypress` I will create two subfolders following the [code-coverage instructions](https://github.com/cypress-io/code-coverage#install)

```js
// cypress/support/index.js
import '@cypress/code-coverage/support'
// cypress/plugins/index.js
module.exports = (on, config) => {
  require('@cypress/code-coverage/task')(on, config)
  // IMPORTANT to return the config object
  // with the any changed environment variables
  return config
}
```

Finally, in `cypress.json` file I will place the global settings like the base url:

```json
{
  "baseUrl": "http://localhost:8080"
}
```

We can start the application with code instrumentation and open Cypress by using NPM scripts

```json
{
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "lint": "vue-cli-service lint",
    "dev": "NODE_ENV=test start-test serve 8080 cy:open",
    "cy:open": "cypress open"
  }
}
```

We can place our first end-to-end spec file in `cypress/integration` folder

```js
/// <reference types="cypress" />
describe('Calculator', () => {
  beforeEach(() => {
    cy.visit('/')
  })
  it('computes', () => {
    cy.contains('.button', 2).click()
    cy.contains('.button', 3).click()
    cy.contains('.operator', '+').click()
    cy.contains('.button', 1).click()
    cy.contains('.button', 9).click()
    cy.contains('.operator', '=').click()
    cy.contains('.display', 42)
    cy.log('**division**')
    cy.contains('.operator', '÷').click()
    cy.contains('.button', 2).click()
    cy.contains('.operator', '=').click()
    cy.contains('.display', 21)
  })
})
```

Locally, I will use `npm run dev` command to start the application and open Cypress. The above test passes quickly. Our calculator seems to add and divide numbers just fine.

![Calculator test](./images/calculator.gif)

The code coverage plugin automatically generates code coverage reports at the end of the run, as you can see from the messages in the Command Log on the left of the Test Runner. The reports are stored in the folder `coverage`, and by default there are several output formats.

```text
coverage/
  lcov-report/
    index.html         # human HTML report
    ...
  clover.xml           # coverage report for Clover Jenkins reporter
  coverage-final.json  # plain JSON output for reporting
  lcov.info            # line coverage report
                       # for 3rd party reporting services
```

While working with tests locally, I prefer opening the HTML coverage report

```shell
$ open coverage/lcov-report/index.html
```

![Coverage report](./images/coverage-report.png)

End-to-end tests are _effective_. With a single test that loads and interacts with the entire application we have covered 60% of the source code. Even better, by drilling down to the individual files, we discover in `src/components/Calculator.vue` the features we have not tested yet.

![Covered lines in Calculator.vue file](./images/covered-lines.png)

The source lines highlighted in red are the lines missed by the test. We can see that we still need to write a test that clears the current number, changes the sign, sets the decimal point, multiplies, etc. But we did test typing numbers (appending) and diving numbers. The test writing thus becomes following the code coverage as a guide to writing end-to-end tests to travel to all places marked in red.

As we write more tests we quickly gain coverage and confidence in our application. In the last test we will cover `decimal ()` method that remains uncovered still.

![Decimal method without any coverage](./images/decimal.png)

The test types a single digit number and clicks "." operator. The display should show "5."

```js
it('decimal', () => {
  cy.contains('.button', '5').click()
  cy.contains('.button', '.').click()
  cy.contains('.display', '5.')
})
```

Hmm, this is weird, the test fails.

![Decimal test fails](./images/decimal-fails.png)

A power of Cypress test is that it runs in the browser. Let's debug the failing test. Put a breakpoint in the `src/components/Calculator.vue`

```js
decimal() {
  debugger
  if (this.display.indexOf(".") === -1) {
    this.append(".");
  }
},
```

Run the test again, and wait until it hits the `debugger` keyword (keep the DevTools open)

![Debugging decimal method](./images/debugger.png)

Ohh, the `this.display` is a Number, not a String. Thus `.indexOf()` does not exist. Let's fix it.

```js
decimal() {
  if (String(this.display).indexOf(".") === -1) {
    this.append(".");
  }
},
```

The test passes. The code coverage tells us that the "Else" path of the condition has not been taken yet.

![Else path not taken](./images/decimal-else.png)

Extend the test to cover all code paths and turn it green

![Decimal test passes](./images/decimal-test-passes.png)

![All code paths covered](./images/decimal-covered.png)

Now let's run all tests again. All tests pass in less than 3 seconds

![All tests passing](./images/all-tests.gif)

And the tests together cover our entire code base.

![Full code coverage](./images/full-cover.png)
