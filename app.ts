#!/usr/bin/env node
import * as commander from 'commander';
import yaml from 'yaml';
import path from 'path';
const fs = require('fs-extra');


const program = new commander.Command();

program
  .option('-r, --recursive', 'iterates recursively through path')
  .option('-t, --type <string>', 'filetype of files to convert')
  // .argument('<string>', 'path to file or folder')
  .description('convert aspect-unit-definition json to yaml')
  .action(convert);

program.parse();


interface JSONObject {
  [key: string]: any
}


const filterModel:JSONObject = {
  "version": null,
  "pages": [],
  "sections": [],
  "elements": [],
  "content": [],
  "type": {
    "button": {
      "label": null,
      "id": null,
      "alias": null,
    },
    "text": {
      "text": null,
      // "id": null,
      // "alias": null,
    },
    "dropdown": {
      "label": null,
      "id": null,
      "alias": null,
      "options": []
    },
    "cloze": {
      "id": null,
      "alias": null,
      "document": {}
    },
    "paragraph": {
      "content": []
    },
    "TextField": {
    },
    "doc": {
      "content": []
    },
    "image": {
      "id": null,
      "alias": null,
      // "src": null,
      "alt": null,
      "fileName": null
    },
    "drop-list": {
      "id": null,
      "alias": null,
      "value": null,
      "connectedTo": []
    },
    "slider": {
      "label": null,
      "value": null,
    },
    "checkbox": {
    },
    "geometry": {
      "id": null,
      "alias": null
    },
    "audio": {
      "id": null,
      "alias": null,
      // "src": null,
      "fileName": null
    }
  }
};


function convert() {
  const opts = program.opts();
  console.log(program.args[0]);
  // if (program.args.length > 0) {
  //   for (let path in program.args ) {
  //     console.log(path);
  //     loadFile(path);
  //   }
  // }
  const filePath = "./data/01_Units/DH041.voud";
  loadFile(filePath);
}


function checkJSON(jsonData: any) {
  return jsonData.hasOwnProperty("type") && jsonData.type == "aspect-unit-definition";
  // TODO: check for different versions
}


function convertJSON(jsonData: JSONObject, filePath: string): JSONObject {
  const outObj:JSONObject = {};

  for (let objKey in filterModel) {
    if (jsonData.hasOwnProperty(objKey)) {
      if (typeof jsonData[objKey] === 'object') {
        if (Array.isArray(jsonData[objKey])) {
          let valueArray: JSONObject[] = [];
          for (let i= 0; i < jsonData[objKey].length; i++) {
            let value: JSONObject = convertJSON(jsonData[objKey][i], filePath);
            if (Object.keys(value).length > 0) {
              valueArray.push(value);
            }
          }
          outObj[objKey] = valueArray;
        }
      } else {
        if (objKey == "type") {
          if (filterModel.type.hasOwnProperty(jsonData[objKey])) {
            let innerObj: JSONObject = {};
            for (let key in filterModel["type"][jsonData[objKey]]) {
              let attr = jsonData[key];
              if (attr !== 'undefined') {
                if (typeof attr === 'string') {
                  innerObj[key] = attr.replace(/(<([^>]+)>)/gi, "");
                } else if (typeof attr === 'object') {
                  if (Array.isArray(attr)) {
                    let valueArray: JSONObject[] = [];
                    for (let i= 0; i < attr.length; i++) {
                      valueArray.push(convertJSON(attr, filePath));
                    }
                    innerObj[key] = valueArray;
                  } else {
                    innerObj[key] = convertJSON(attr, filePath);
                  }
                }
              }
            }
            // save audio and image files
            if (jsonData['type'] == 'audio' || jsonData['type'] == 'image') {
              if (jsonData.hasOwnProperty('src')) {
                let mimeType= jsonData['src'].split(';base64,').shift();
                let basePath = path.dirname(filePath);
                let fileName: string = jsonData['fileName'];
                if (!fileName) {
                  fileName = path.basename(filePath, path.extname(filePath));
                  switch (mimeType) {
                    case 'data:audio/mpeg': fileName += ".mp3";
                    // TODO add mimetypes for png, jpg etc.
                  }
                }
                fs.writeFile(basePath+'/'+fileName, jsonData['src'], {encoding: 'base64'}, err => {
                  if (err) {
                    console.error(err);
                  } else {
                    console.log('File created');
                  }
                });
              }
            }
            outObj[jsonData[objKey]] = innerObj;
          }
        }
      }
    }
  }

  return outObj;
}


function convertSingleObj(singleObj: JSONObject): JSONObject {
  const outObj:JSONObject = {};

  Object.assign(outObj, {"test": true});

  return outObj;
}


function loadFile(filePath: string) {
  console.log("loading");

  fs
    .readJson(filePath)
    .then((data: JSON) => {
      // console.log(checkJSON(data));
      // convertJSON(data, filePath);
      let yamlData = yaml.stringify(convertJSON(data, filePath));
      let basePath = path.dirname(filePath);
      let fileName = path.basename(filePath, path.extname(filePath));
      fs.writeFile(basePath+'/'+fileName+'.yaml', yamlData, err => {
        if (err) {
          console.error(err);
        } else {
          console.log('yaml saved');
        }
      });
    })
    .catch((error: any) => {
      console.log(error);
    });
}

module.exports = convert;
