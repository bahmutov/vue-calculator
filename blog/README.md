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
