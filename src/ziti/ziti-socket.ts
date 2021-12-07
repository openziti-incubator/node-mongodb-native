/* eslint-disable @typescript-eslint/no-this-alias */

import { EventEmitter } from 'events';
import { Socket, AddressInfo } from 'net';

// export class ZitiSocket extends Duplex {
export class ZitiSocket extends Socket {
  zitiSDK: any;
  logger: any;
  zitiConnection: any;
  authorized = true;
  encrypted = true;
  alpnProtocol = null;
  constructor(options: any) {
    super();

    this.zitiSDK = options.zitiSDK; // the Ziti native addon (a.k.a. ziti-sdk-nodejs)

    this.logger = options.logger;

    this.zitiConnection = null;

    EventEmitter.call(this);
  }

  /**
   * Make a connection to the specified Ziti 'service'.  We do this by invoking the ziti_dial() function in the Ziti NodeJS-SDK.
   */
  ziti_dial(service: string) {
    this.logger.debug('ZitiSocket.ziti_dial entered, service: %s', service);

    const self = this;
    return new Promise(resolve => {
      if (self.zitiConnection) {
        resolve(self.zitiConnection);
      } else {
        self.zitiSDK.ziti_dial(
          service,

          false, // This is NOT a websocket

          /**
           * on_connect callback.
           */
          (conn: any) => {
            self.logger.debug('ZitiSocket.ziti_dial.on_connect callback entered, conn: %p', conn);
            resolve(conn);
          },

          /**
           * on_data callback (we receive a Buffer containing uint8_t's from the NodeJS SDK)
           */
          (data: any) => {
            self.push(data);
          }
        );
      }
    });
  }

  /**
   * Write data onto the underlying Ziti connection by invoking the ziti_write() function in the Ziti NodeJS-SDK.  The
   * NodeJS-SDK expects incoming data to be of type Buffer.
   */
  ziti_write(conn: any, buffer: any) {
    const self = this;
    return new Promise<void>(resolve => {
      self.zitiSDK.ziti_write(conn, buffer, () => {
        resolve();
      });
    });
  }

  /**
   * Connect to a Ziti service.
   */
  connect(port: any, service: any): this {
    (async () => {
      this.zitiConnection = await this.ziti_dial(service).catch(e =>
        this.logger.error('connect Error: %o', e)
      );

      this.emit('connect');
    })();

    return this;
  }

  /**
   *
   */
  async _read() {
    /* NOP */
  }

  /**
   * Returna a Promise that will resolve _only_ after a Ziti connection has been established for this instance of ZitiSocket.
   */
  getZitiConnection() {
    const self = this;
    return new Promise(resolve => {
      (function waitForConnected() {
        if (self.zitiConnection) return resolve(self.zitiConnection);
        setTimeout(waitForConnected, 10);
      })();
    });
  }

  /**
   * Implements the writeable stream method `_write` by pushing the data onto the underlying Ziti connection.
   * It is possible that this function is called before the Ziti connect has completed, so this function will (currently)
   * await Ziti connection establishment (as opposed to buffering the data).
   */
  _write(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null) => void): Promise<void>;
  async _write(
    chunk: any,
    encoding: BufferEncoding,
    cb: (error?: Error | null) => void
  ): Promise<void> {
    let buffer;
    let callback: (error: Error | null) => void;

    if (typeof chunk === 'string' || chunk instanceof String) {
      buffer = Buffer.from(chunk, encoding);
      callback = cb;
    } else if (Buffer.isBuffer(chunk)) {
      buffer = chunk;
      callback = cb;
    } else {
      throw new Error('chunk type of [' + typeof chunk + '] is not a supported type');
    }

    if (buffer.length > 0) {
      const conn = await this.getZitiConnection().catch((e) =>
        this.logger.error('inside ziti-socket.js _write(), Error 1: ', e.message)
      );

      await this.ziti_write(conn, buffer).catch(e => this.logger.error('write(), Error: %o', e));
    }

    if (callback) {
      callback(null);
    }
  }

  /**
   * Implements the writeable stream method `_final` used when .end() is called to write the final data to the stream.
   */
  _final(cb: any) {
    cb();
  }

  /**
   *
   */
  setTimeout(timeout: number, callback?: () => void): this {
    return this;
  }

  /**
   *
   */
  setNoDelay(noDelay?: boolean): this {
    return this;
  }

  setKeepAlive(enable?: boolean, initialDelay?: number): this {
    return this;
  }

  // address(): AddressInfo {
  // return { port: 12346, family: 'IPv4', address: '127.0.0.1' };
  // }
}
