var _ = require('lodash');
var db = require('./db');

var COMMAND = {
  EXPIRE:   { minArgs: 2, numArgs: 2,        name: 'EXPIRE' },
  TTL:      { minArgs: 1, numArgs: 1,        name: 'TTL' },
  DEL:      { minArgs: 1, numArgs: 1,        name: 'DEL' },
  FLUSHDB:  { minArgs: 0, numArgs: 0,        name: 'FLUSHDB' },
  SET:      { minArgs: 2, numArgs: 2,        name: 'SET' },
  GET:      { minArgs: 1, numArgs: 1,        name: 'GET' },
  LLEN:     { minArgs: 1, numArgs: 1,        name: 'LLEN' },
  RPUSH:    { minArgs: 2, numArgs: Infinity, name: 'RPUSH' },
  LPOP:     { minArgs: 1, numArgs: 1,        name: 'LPOP' },
  RPOP:     { minArgs: 1, numArgs: 1,        name: 'RPOP' },
  LRANGE:   { minArgs: 3, numArgs: 3,        name: 'LRANGE' },
  SADD:     { minArgs: 2, numArgs: Infinity, name: 'SADD' },
  SCARD:    { minArgs: 1, numArgs: 1,        name: 'SCARD' },
  SMEMBERS: { minArgs: 1, numArgs: 1,        name: 'SMEMBERS' },
  SREM:     { minArgs: 2, numArgs: Infinity, name: 'SREM' },
  SINTER:   { minArgs: 0, numArgs: Infinity, name: 'SINTER' },
  SAVE:     { minArgs: 0, numArgs: 0,        name: 'SAVE' },
  RESTORE:  { minArgs: 0, numArgs: 0,        name: 'RESTORE' }
};

exports.execute = function (command, args, options, done) {
  command = (command || '').toUpperCase();
  args = args || [];

  db.setOptions(options);

  var commandInfo = COMMAND[command];
  if (commandInfo &&
      ((commandInfo.numArgs != Infinity && args.length != commandInfo.numArgs) ||
      (commandInfo.numArgs == Infinity && args.length < commandInfo.minArgs))) {
    return done(db.RESULT_CODE.INVALID);
  }

  var response = '';

  switch (command) {
    case COMMAND.EXPIRE.name:
      response = db.expire(args[0], args[1]);
      break;

    case COMMAND.TTL.name:
      response = db.ttl(args[0]);
      break;

    case COMMAND.DEL.name:
      response = db.del(args[0]);
      break;

    case COMMAND.FLUSHDB.name:
      response = db.flushdb();
      break;

    case COMMAND.GET.name:
      response = db.get(args[0]);
      break;

    case COMMAND.SET.name:
      response = db.set(args[0], args[1]);
      break;

    case COMMAND.LLEN.name:
      response = db.llen(args[0]);
      break;

    case COMMAND.RPUSH.name:
      response = db.rpush(args[0], args.slice(1));
      break;

    case COMMAND.LPOP.name:
      response = db.lpop(args[0]);
      break;

    case COMMAND.RPOP.name:
      response = db.rpop(args[0]);
      break;

    case COMMAND.LRANGE.name:
      response = db.lrange(args[0], args[1], args[2]);
      break;

    case COMMAND.SADD.name:
      response = db.sadd(args[0], args.slice(1));
      break;

    case COMMAND.SCARD.name:
      response = db.scard(args[0]);
      break;

    case COMMAND.SMEMBERS.name:
      response = db.smembers(args[0]);
      break;

    case COMMAND.SREM.name:
      response = db.srem(args[0], args.slice(1));
      break;

    case COMMAND.SINTER.name:
      response = db.sinter(args);
      break;

    case COMMAND.SAVE.name:
      db.save(function(response) {
        return done(response);
      });
      break;

    case COMMAND.RESTORE.name:
      db.restore(function(response) {
        return done(response);
      });
      break;

    default:
      response = db.RESULT_CODE.UNKNOWN_COMMAND;
  }

  return done(response);
}
