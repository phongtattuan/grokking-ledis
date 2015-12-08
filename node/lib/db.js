var _ = require('lodash');
var sizeof = require('sizeof');

var defaultOptions = {
  memoryLimit: 1024
};

var data = [];
var options = defaultOptions;
var currentDbIndex = 0;

data[currentDbIndex] = {};

// Result code
var RESULT_CODE = {
  OK:              'OK',
  OUT_OF_MEMORY:   'EMEM',
  INVALID:         'EINV',
  UNKNOWN_COMMAND: 'ECOM',
  WRONG_KEY:       'EKTYP',
  ERROR_EXECUTION: 'EEXE'
};

exports.RESULT_CODE = RESULT_CODE;

/* General function */
exports.setOptions = function (opts) {
  options = _.assign(defaultOptions, opts);
};

exports.select = function (dbIndex) {
  currentDbIndex = dbIndex;
};

exports.has = function (key) {
  return !!data[currentDbIndex][key];
};

exports.expire = function (key, seconds) {
  if (!isValidString(key)) {
    return RESULT_CODE.INVALID;
  }
  if (!isValidInteger(seconds)) {
    return RESULT_CODE.INVALID;
  }

  seconds = parseInt(seconds);
  if (seconds < 0) {
    return 0;
  }

  if (!this.has(key)) {
    return 0;
  }

  data[currentDbIndex][key].expire = Date.now() + seconds * 1000;
  setTimeout(function () {
    exports.del(key);
  }, seconds * 1000);

  return 1;
};

exports.ttl = function (key) {
  if (!isValidString(key)) {
    return RESULT_CODE.INVALID;
  }
  if (!this.has(key)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var ttl = -1;
  if (data[currentDbIndex][key].expire) {
    ttl = Math.round((data[currentDbIndex][key].expire - Date.now()) / 1000);
    if (ttl < 0) {
      ttl = 0;
    }
  }

  return ttl;
};

exports.del = function (key) {
  if (!isValidString(key)) {
    return RESULT_CODE.INVALID;
  }
  if (!this.has(key)) {
    return RESULT_CODE.WRONG_KEY;
  }

  delete data[currentDbIndex][key];
  return RESULT_CODE.OK;
};

exports.flushdb = function () {
  data[currentDbIndex] = {};
  return RESULT_CODE.OK;
};

/* String function */
exports.set = function (key, value) {
  if (!isValidString(key)) {
    return RESULT_CODE.INVALID;
  }
  if (isInResultCode(value)) {
    return RESULT_CODE.INVALID;
  }
  if (sizeof.sizeof(data) + sizeof.sizeof(value) > options.memoryLimit) {
    return RESULT_CODE.OUT_OF_MEMORY;
  }

  data[currentDbIndex][key] = {
    value: value
  };
  return RESULT_CODE.OK;
};

exports.get = function (key) {
  if (!isValidString(key)) {
    return RESULT_CODE.INVALID;
  }
  if (!this.has(key)) {
    return RESULT_CODE.WRONG_KEY;
  }

  return data[currentDbIndex][key].value;
};

/* List function */
exports.llen = function (key) {
  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
  }
  if (!isArray(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var realLength = 0;
  for(var idx = 0; idx < value.length; idx++) {
    if(value[idx] != null) {
      realLength++;
    }
  }
  return realLength;
};

exports.rpush = function (key, values) {
  var value = this.get(key);
  if (value == RESULT_CODE.INVALID) {
    return RESULT_CODE.INVALID;
  }

  if (value == RESULT_CODE.WRONG_KEY) {
    value = [];
  }

  if(!isArray(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  values.forEach(function (v) {
    value.push(v);
  })

  var result = this.set(key, value);
  if (isInResultCode(result)) {
    return result;
  }

  return values.length;
};

exports.lpop = function (key) {
  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
  }

  if(!isArray(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  if(value.length == 0) {
    return null;
  }

  return value.shift();
};

exports.rpop = function (key) {
  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
  }

  if(!isArray(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  if(value.length == 0) {
    return null;
  }

  return value.pop();
};

exports.lrange = function (key, start, stop) {
  if (!isValidInteger(start)) {
    return RESULT_CODE.INVALID;
  }
  if (!isValidInteger(stop)) {
    return RESULT_CODE.INVALID;
  }

  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
  }

  if(!value || !isArray(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var start = parseInt(start) - 1;
  var stop = parseInt(stop) - 1;

  if (start < 0 || stop < 0) {
    return RESULT_CODE.INVALID;
  }

  var slice =  value.slice(start, stop+1);
  return slice;
};

/* Set function */
exports.sadd = function (key, members) {
  var value = this.get(key);
  if (value == RESULT_CODE.INVALID) {
    return RESULT_CODE.INVALID;
  }

  if (value == RESULT_CODE.WRONG_KEY) {
    value = {};
  }

  if(!isSet(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var num = 0;
  members.forEach(function (m) {
    if (!value[m]) {
      value[m] = true;
      num++;
    }
  });

  var result = this.set(key, value);
  if (isInResultCode(result)) {
    return result;
  }

  return num;
};

exports.scard = function (key) {
  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
  }
  if(!isSet(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var card = 0;
  for(var idx in value) {
    card++;
  }
  return card;
};

exports.smembers = function (key) {
  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
  }

  if(!isSet(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  if(!value) {
    value = {};
  }
  var result = [];
  for(var idx in value) {
    result.push(idx);
  }
  return result;
};

exports.srem = function (key, members) {
  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
  }

  if(!isSet(set)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var num = 0;
  members.forEach(function (m) {
    if (value[m]) {
      delete value[m];
      num++;
    }
  });

  return num;
};

exports.sinter = function (keys) {
  var tmp = null;
  keys.forEach(function (key) {
    var value = this.get(key);
    if (isInResultCode(value)) {
      return value;
    }
    if(!isSet(value)) {
      return RESULT_CODE.WRONG_KEY;
    }
    if(!value) {
      return [];
    }

    if (!tmp) {
      tmp = value;
    }
    else {
      for(var member in tmp) {
        if(!value[member]) {
          delete tmp[member];
        }
      }
    }
  }, this);

  var result = [];
  for(var k in tmp) {
    result.push(k);
  };

  return result;
};

/* Snapshot function */
exports.save = function (callback) {
  var fs = require('fs');
  var filename = 'snapshot.lrdb';
  var dt = JSON.stringify(data);
  fs.writeFile(filename, dt, function (err) {
    if (err) {
      console.log(err);
      return callback(RESULT_CODE.ERROR_EXECUTION);
    }
    return callback(RESULT_CODE.OK);
  });
};

exports.restore = function (callback) {
  var fs = require('fs');
  var filename = 'snapshot.lrdb';
  fs.readFile(filename, 'utf8', function (err, dt) {
    if (err) {
      console.log(err);
      return callback(RESULT_CODE.ERROR_EXECUTION);
    }

    try {
      tmp = JSON.parse(dt);
    }
    catch (ex) {
      return callback(RESULT_CODE.ERROR_EXECUTION);
    }

    data = tmp;
    return callback(RESULT_CODE.OK);
  });
};

//
function isValidString (value) {
  return _.isString(value) && /^[a-z]*$/.test(value);
}

function isValidInteger (value) {
  return (value == parseInt(value, 10)) && value > -2147483648 && value < 2147483648;
}

function isArray (value) {
  return _.isArray(value);
}

function isSet (value) {
  if(isArray(value)) {
    return false;
  }
  return (value !== null && typeof value === 'object');
}

function isInResultCode (value) {
  return (_.values(RESULT_CODE).indexOf(value) != -1);
}