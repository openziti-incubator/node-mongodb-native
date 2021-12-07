const ziti = require('ziti-sdk-nodejs');

export var Ziti: {
  ziti_hello(): string
  ziti_init(zitiIdentityFile: any, cb: any): number
} = ziti
