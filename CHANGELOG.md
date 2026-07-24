# Changelog

## [1.5.0](https://github.com/ericwong0318/chrome-extensions/compare/v1.4.1...v1.5.0) (2026-07-24)


### Features

* add unit tests for ContentControls component ([cb164f4](https://github.com/ericwong0318/chrome-extensions/commit/cb164f425b439b8d1b8042778801b6b7382b5e44))


### Bug Fixes

* resolve TypeScript type assertion error in useBlockUser.ts storage listener ([9d53170](https://github.com/ericwong0318/chrome-extensions/commit/9d53170f811cfcf56d5062a55f66329a358b5108))

## [1.4.1](https://github.com/ericwong0318/chrome-extensions/compare/v1.4.0...v1.4.1) (2026-07-22)


### Bug Fixes

* correct space formatting of agent descriptions in Bias, Logic, and Parser files ([e778920](https://github.com/ericwong0318/chrome-extensions/commit/e77892007c55d3fa330408bc65db35f9b99955ae))
* update Stack and TextField components for better styling and input handling ([a7e9890](https://github.com/ericwong0318/chrome-extensions/commit/a7e9890a40719c07e36186568fb681ea25c79ab4))

## [1.4.0](https://github.com/ericwong0318/chrome-extensions/compare/v1.3.1...v1.4.0) (2026-07-22)


### Features

* add multi‑provider AI fallback with ordered provider list and UI updates ([7ddf27a](https://github.com/ericwong0318/chrome-extensions/commit/7ddf27aadcde93df5d611ce17516c18a74f53a24))
* centralize fact-check provider config normalization ([2b70d52](https://github.com/ericwong0318/chrome-extensions/commit/2b70d5268e42d380de95a9056a4e4fbb980b1cb2))
* Fact Check reply-language setting and inline button placement ([db7751b](https://github.com/ericwong0318/chrome-extensions/commit/db7751bb418d7580aeae8d15f02222f631bd0130))
* implement multi-agent fact-checking pipeline with placeholder agents ([aa8f74a](https://github.com/ericwong0318/chrome-extensions/commit/aa8f74a802cad31163817626a58c3aab3c485753))
* store error logs locally and show them in options page ([486f675](https://github.com/ericwong0318/chrome-extensions/commit/486f67554cff23b54966d8642dc1dcc211c7a037))


### Bug Fixes

* add block buttons to lazy-loaded answers via MutationObserver ([4d283e1](https://github.com/ericwong0318/chrome-extensions/commit/4d283e1c4cde985678e5f0652ac4ecdba9f1ae1a))
* add missing [@emotion](https://github.com/emotion) peer dependencies for MUI ([a8cbf18](https://github.com/ericwong0318/chrome-extensions/commit/a8cbf18c1807b3c3ff39360955c94b4c4b762b13))
* cancel in-flight fact-check provider calls when content port disconnects ([900009a](https://github.com/ericwong0318/chrome-extensions/commit/900009a04a5f331db61214eeeb683bda21988460))
* **deps:** align react-dom and types with React 19 in PR [#8](https://github.com/ericwong0318/chrome-extensions/issues/8)\n\n- bump react-dom to ^19.2.8\n- bump @types/react-dom to ^19.2.3\n\nReproduced CI locally: npm install, npm test, npm run build (all success). ([5d26ab3](https://github.com/ericwong0318/chrome-extensions/commit/5d26ab30294f32d8bbcc9b84192cfd9d13b76007))
* enhance provider configuration validation for local and other providers ([68faff3](https://github.com/ericwong0318/chrome-extensions/commit/68faff35f2660b5a50ea921b41ab845506fb62d4))
* fix UI language update in FactCheck component ([26527d7](https://github.com/ericwong0318/chrome-extensions/commit/26527d7fe6283c73c9306de7d0faf37c8d6a60e1))
* ignore benign ResizeObserver loop notifications in error log ([06aac0f](https://github.com/ericwong0318/chrome-extensions/commit/06aac0fa48604a047ea8ea2a7d62231f1e46593a))
* local provider configuration with CORS instructions and add AI task completion protocol ([a9e3175](https://github.com/ericwong0318/chrome-extensions/commit/a9e317532836b7a4a6e399d45b24939e7d675bac))
* remove unnecessary permissions from manifest.json ([7c4ed88](https://github.com/ericwong0318/chrome-extensions/commit/7c4ed88c86cfe2026a6fef9573317d7444216b92))
* update authorization header assignment to use dot notation ([0b71618](https://github.com/ericwong0318/chrome-extensions/commit/0b716180d58245fff3caae7f7d7f480554710a43))
* update FactCheck to include provider information in result type ([906473a](https://github.com/ericwong0318/chrome-extensions/commit/906473a6c89fbeba6f28e7cd0a8d874e79715d25))

## [1.3.1](https://github.com/ericwong0318/chrome-extensions/compare/v1.3.0...v1.3.1) (2026-07-21)


### Bug Fixes

* local provider configuration with CORS instructions and add AI task completion protocol ([15318fe](https://github.com/ericwong0318/chrome-extensions/commit/15318fe9155fdaee59a2bf5239f83ed280ee5176))

## [1.3.0](https://github.com/ericwong0318/chrome-extensions/compare/v1.2.1...v1.3.0) (2026-07-20)


### Features

* add multi‑provider AI fallback with ordered provider list and UI updates ([92f6290](https://github.com/ericwong0318/chrome-extensions/commit/92f62908a99a63c216b28316ce30b6a491c00b0e))
* implement multi-agent fact-checking pipeline with placeholder agents ([a04756f](https://github.com/ericwong0318/chrome-extensions/commit/a04756f58a7f1acbd9caab60c18989dbaaa07ffc))


### Bug Fixes

* fix UI language update in FactCheck component ([b5187c8](https://github.com/ericwong0318/chrome-extensions/commit/b5187c8d32bb6dada62ee3c50285c528be408758))

## [1.2.1](https://github.com/ericwong0318/chrome-extensions/compare/v1.2.0...v1.2.1) (2026-07-19)


### Bug Fixes

* add missing [@emotion](https://github.com/emotion) peer dependencies for MUI ([a8cbf18](https://github.com/ericwong0318/chrome-extensions/commit/a8cbf18c1807b3c3ff39360955c94b4c4b762b13))
