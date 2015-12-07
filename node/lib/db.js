var _ = require('lodash');
var sizeof = require('sizeof');

var defaultOptions = {
  memoryLimit: 1024;
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

exports.setOptions = function (opts) {
  options = _.assign(defaultOptions, opts);
};

/* General function */
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
    export.del(key);
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
    return value;
  }
  if(!isArray(value)) {
    return RESULT_CODE.WRONG_KEY;
  }

  if (value == RESULT_CODE.WRONG_KEY) {
    value = [];
  }

  values.forEach(function (v) {
    value.push(v);
  })
  this.set(key, value);
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
    return RESULT_CODE.WRONG_KEY;
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
    return RESULT_CODE.WRONG_KEY;
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
  var set = this.get(key);
  if (isInResultCode(set)) {
    return set;
  }

  if(!set) {
    set = {};
  }

  if(!is_set(set)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var num = 0;
  members.forEach(function (m) {
    if (!set[m]) {
      set[m] = true;
      num++;
    }
  });

  this.set(key, set);

  return num;
};

exports.scard = function (key) {
  var set = this.get(key);
  if (isInResultCode(set)) {
    return set;
  }

  var card = 0;
  for(var idx in set) {
    card++;
  }
  return card;
};

exports.smembers = function (key) {
  var value = this.get(key);
  if (isInResultCode(value)) {
    return value;
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
  var set = this.get(key);
  if (isInResultCode(set)) {
    return set;
  }

  if(!is_set(set)) {
    return RESULT_CODE.WRONG_KEY;
  }

  var num = 0;
  members.forEach(function (m) {
    if (set[m]) {
      delete set[m];
      num++;
    }
  });

  return num;
};


exports.sinter = function (keys) {
  do {
    var first_key = keys.shift();
    var tmp = this.get(first_key);
  } while(!tmp);

  tmp = JSON.parse(JSON.stringify(tmp));

  keys.forEach(function (key) {
    var set = this.get(key);
    if(!set) {
      return [];
    }

    for(var member in tmp) {
      if(!set[member]) {
        delete tmp[member];
      }
    }
  }, this);

  var result = [];
  for(var idx in tmp) {
    result.push(idx);
  }

  return result;
};

/* Snapshot function */
exports.save = function (snapshotName, callback) {
  var fs = require('fs');
  var filename = 'snapshot.lrdb';
  var data = JSON.stringify(data);
  fs.writeFile(filename, data, function (err) {
    if (err) {
      console.log(err);
      return callback(RESULT_CODE.ERROR_EXECUTION);
    }
    return callback(RESULT_CODE.OK);
  });
};

exports.restore = function (snapshotName, callback) {
  var fs = require('fs');
  var filename = 'snapshot.lrdb';
  data = fs.readFileSync(filename, 'utf8', function (err, dt) {
    if (err) {
      console.log(err);
      return callback(RESULT_CODE.ERROR_EXECUTION);
    }

    data = JSON.parse(dt);
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