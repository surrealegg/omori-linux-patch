if (require("os").platform() === "linux") {
    const fs = require("fs");
    const path = require("path");
    const cwd = process.cwd();
  
    // 1. The game expects this env to be set, but it's not on linux
    process.env.LOCALAPPDATA = process.env.HOME + "/.local/share";
  
    /**
     * Returns an actual path ignoring the case sensitivity.
     * Throws an error if it finds nothing.
     *
     * @param {string} target
     * @returns
     */
    function realpath(target) {
      target = path.normalize(target);
      const sections = target.split("/").filter((s) => s !== "");
      const basePath = path.isAbsolute(target) ? "" : cwd;
  
      /**
       * Try getting actual file/folder name inside a directory.
       * Throws an error if it finds nothing.
       *
       * @param {string} current a file or a direcorty to be checked
       * @param {string} directory
       * @returns {string}
       */
      function tryMatchPaths(current, directory) {
        const lowerCase = current.toLowerCase();
        for (const file of directory) {
          if (file.toLowerCase() === lowerCase) {
            return (file);
          }
        }
        throw new Error(`${current}: no such file or directory.`);
      }
  
      return (sections.reduce(
        (previous, current) =>
          previous + "/" + tryMatchPaths(current, oldReadDirSynx("/" + previous)),
        basePath,
      ));
    }
  
    // 2. Wrapping all the fs methods that being used by the game
    // to support case insesitivity.
    const oldReadDirSynx = fs.readdirSync;
    fs.readdirSync = (path, options) => {
      return (oldReadDirSynx(realpath(path), options));
    };
  
    const oldStatSync = fs.statSync;
    fs.statSync = (path, options) => {
      return (oldStatSync(realpath(path), options));
    };
  
    const oldReadFileSync = fs.readFileSync;
    fs.readFileSync = (path, options) => {
      return (oldReadFileSync(realpath(path), options));
    };
  
    const oldExistsSync = fs.existsSync;
    fs.existsSync = (path) => {
      try {
        return (oldExistsSync(realpath(path)));
      } catch (e) {
        return (false);
      }
    };
  
    const oldBitmapLoad = Bitmap.load;
    Bitmap.load = function (url) {
      return (oldBitmapLoad(realpath(url).replace(cwd + "/", "")));
    };
  
    WebAudio = class extends WebAudio {
      /**
       * Converts Buffer into ArrayBuffer
       *
       * @param {Buffer} buffer
       * @returns
       */
      toArrayBuffer(buffer) {
        const arrayBuffer = new ArrayBuffer(buffer.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < buffer.length; ++i) {
          view[i] = buffer[i];
        }
        return (arrayBuffer);
      }
  
      /**
       * a function to load an audio.
       *
       * @param {string} url
       * @returns
       */
      _load(url) {
        if (!WebAudio._context) {
          return;
        }
        if (Decrypter.hasEncryptedAudio) {
          url = Decrypter.extToEncryptExt(url);
        }
        const fs = require("fs");
        const path = require("path");
        const base = path.dirname(process.mainModule.filename);
        const filename = decodeURI(url).replace(/\+/g, " ");
        fs.readFile(realpath(base + "/" + filename), (err, array) => {
          if (err) {
            throw new Error(err);
          }
          array = this.toArrayBuffer(array);
          if (Decrypter.hasEncryptedAudio) {
            array = Decrypter.decryptArrayBuffer(array);
          }
          this._readLoopComments(new Uint8Array(array));
          WebAudio._context.decodeAudioData(
            array,
            function (buffer) {
              this._buffer = buffer;
              this._totalTime = buffer.duration;
              if (this._loopLength > 0 && this._sampleRate > 0) {
                this._loopStart /= this._sampleRate;
                this._loopLength /= this._sampleRate;
              } else {
                this._loopStart = 0;
                this._loopLength = this._totalTime;
              }
              this._onLoad();
            }.bind(this),
          );
        });
      }
    };
  
    window.addEventListener("load", function () {
      DataManager = class extends DataManager {
        static loadTiledMapData(mapId) {
          const path = require("path");
          const fs = require("fs");
          const base = path.dirname(process.mainModule.filename);
          const mapName = `/maps/map${mapId}.json`;
          this.unloadTiledMapData();
          fs.readFile(base + mapName, (err, buffer) => {
            if (err) {
              console.error(err);
              return;
            }
            DataManager._tempTiledData = JSON.parse(buffer.toString());
            DataManager.loadTilesetData();
            DataManager._tiledLoaded = true;
          });
        }
  
        static loadTilesetData() {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;
  
          try {
            function _loop() {
              var tileset = _step.value;
  
              if (!tileset.source) {
                return;
              }
  
              if (Utils.isOptionValid("test")) {
                DataManager._tilesetToLoad++;
                const fs = require("fs");
                const path = require("path");
                const base = path.dirname(process.mainModule.filename);
                const filename = tileset.source.replace(/^.*[\\\/]/, "");
                fs.readFile(realpath(base + "/maps/" + filename), (err, data) => {
                  if (err) {
                    console.error(err);
                    return;
                  }
                  Object.assign(
                    tileset,
                    JSON.parse(data.toString()),
                  );
                  DataManager._tilesetToLoad--;
                });
              } else {
                DataManager._tilesetToLoad++;
                const filename = tileset.source.replace(/^.*[\\\/]/, "");
                const path = require("path");
                const fs = require("fs");
                const base = path.dirname(process.mainModule.filename);
                filename = filename.replace(".json", ".AUBREY");
                fs.readFile(realpath(base + "/maps/" + filename), (err, data) => {
                  if (err) {
                    console.error(err);
                    return;
                  }
                  data = Encryption.decrypt(data);
                  Object.assign(tileset, JSON.parse(data.toString()));
                  DataManager._tilesetToLoad--;
                });
              }
            }
  
            for (
              var _iterator = DataManager._tempTiledData.tilesets
                  [Symbol.iterator](),
                _step;
              !(_iteratorNormalCompletion = (_step = _iterator.next()).done);
              _iteratorNormalCompletion = true
            ) {
              _loop();
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
      };
    });
  }
  