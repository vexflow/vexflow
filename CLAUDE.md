# Code Quality and Comments

When reading through code, if you notice there are incorrect or outdated comments, please mark them so that we can review the comments:

```
  // BAD_COMMENT_BELOW?
  // renderSymbol(...) takes three arguments.
  function renderSymbol(arg1) {
    ...
  }
```

When reading through code, if you notice possible bugs, please mark them as follows:

```
  // addTwoNumbers(...)
  function addTwoNumbers(a, b) {
    // POSSIBLE_BUG_BELOW?
    return a - b;
  }
```
