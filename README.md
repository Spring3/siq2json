#### Siq2json

Converts the packages for [SiGame](https://vladimirkhil.com/si/game) from xml to json with image optimization

On average, resulting packages become 10-15% smaller in size.

SiGame currently doesn't support json format, this npm module was made "for science" with potentially some use in future.


```
npm i -g siq2json

siq <path/to/file.siq>
```

This will create a `file-json.zip` file in the same directory as the original package file.
