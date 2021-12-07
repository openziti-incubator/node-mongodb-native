import { MongoInvalidArgumentError, MongoNetworkError, MongoRuntimeError } from '../error';
import type { Callback } from '../utils';
import type { MongoClient, MongoOptions } from '../mongo_client';

export function zitiInit(
  mongoClient: MongoClient,
  options: MongoOptions,
  callback: Callback<MongoClient>
): void {
  if (!callback) {
    throw new MongoInvalidArgumentError('Callback function must be provided');
  }

  const logger = mongoClient.logger;
  const zitiInitCallback: Callback = err => {
    callback(err, mongoClient);
  };

  return _zitiInit(mongoClient, options, zitiInitCallback);

}

function _zitiInit(mongoClient: MongoClient, options: MongoOptions, callback: Callback<number>) {
  const logger = mongoClient.logger;
  const rc = options.zitiSDK.ziti_init(options.zitiIdentity, (init_rc: number) => {
    if (init_rc < 0) {
      if (init_rc === -30) {
        logger.debug('ignoring PARTIALLY_AUTHENTICATED event from controller');
        return;
      }
      return callback(new MongoNetworkError(`ziti_init failed with rc ${init_rc}`));
    }
    // Successful connection to Ziti Controller
    callback(undefined, 0);
    return;
  });
  if (rc < 0) {
    return callback(new MongoNetworkError(`ziti_init failed with rc ${rc}`));
  }
}
