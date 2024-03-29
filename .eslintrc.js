module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": "eslint-config-egg",
    "parserOptions": {
    },
    "rules": {
        "indent": ["error", 4],
        "no-unused-vars": ["off"],
        "dot-notation": [0, { "allowKeywords": true }],
        "prefer-const": 0,
        "quote-props": ["error", "always"]
    }
};