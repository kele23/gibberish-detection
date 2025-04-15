# Gibberish Detector

This utility is used to identify if a string of text contains gibberish, using a relatively simple implementation of Machine Learning and Markov Chaining. The utility is trained with a large sample of legitimate sentences with which it builds a model to determine the probability that any two characters would be found adjacently.

# Usage

Usage with CLI and providing text as parameter
```bash
gibberish test --text "My text" --model en # prebuild model
gibberish test --text "My text" --model model.json # custom model
```

Usage with CLI and providing text in a file
```bash
gibberish test --file text.txt --model en # prebuild model
gibberish test --file text.txt --model model.json # custom model
```

Usage as Javascript library
```javascript
import { testGibberish } from '@kele23/gibberish';
import { MODELS } from '@kele23/gibberish/prebuild';
testGibberish(text, MODELS['en']);
```

# Training

This package is shipped with default models in English and Italian languages you can find them in prebuild section of the project. If necessary, a new model can be generated. As an example, if someone wishes to use this with another language, it might be prudent to generate a model based off of this language.

For best results the training text used should be decently long (at least few megabytes) with diverse and legitimate words. It is not recommended that it be trained using literature from the science fiction and fantasy genres because those selections often contain unusual word formations.

To create a new learning model, you must provide it with the aforementioned large sample of text to build the learning matrix, a sample of short lines of sentences that make sense, and a sample of lines made up of gibberish. It uses the last two data sets to form a threshold between gibberish and non-gibberish text.

You can use the cli tool provided to create a new Model.

```bash
gibberish train --train data/train.txt --goodsm data/good_sm.txt --badsm data/bad_sm.txt --target model.json              
```


# Attributions
 * rrenaud originally created a projected similar to this in python, called [Gibberish-Detector](https://github.com/rrenaud/Gibberish-Detector).
 * Alpha4615 originally ported the library to javascript [gibberish-detection](https://github.com/Alpha4615/gibberish-detection)