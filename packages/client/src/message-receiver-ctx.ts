import { parse } from 'flatted';
import {
  MessageHandler,
  MessageReceiver,
  MessageBody,
  JsonrpcErrorCode,
  composeInterceptors,
  invokeAsPromise,
  JsonrpcResponseBody,
  isJsonrpcResponseBody,
  JsonrpcBaseConfig,
  JsonrpcEnd,
  MessageType,
} from '@cec/jsonrpc-core';

export class MessageReceiverCtx {
  constructor(
    private messageReceiver: MessageReceiver,
    private baseConfig?: JsonrpcBaseConfig,
  ) {}

  receive = (receiveHandler: (message: MessageBody) => void) => {
    const messageHandler: MessageHandler = async (message: string) => {
      let responseBody = parse(message) as JsonrpcResponseBody; // 这一步发生错误的话，错误就不能和传递给 call 方法。所以这里的错误暂时不处理
      if (!isJsonrpcResponseBody(responseBody)) return;

      if (this.baseConfig?.interceptors?.length) {
        try {
          const interceptor = composeInterceptors(this.baseConfig.interceptors!, { end: JsonrpcEnd.Client, type: MessageType.Response });
          responseBody = await invokeAsPromise(interceptor, responseBody);
        } catch (error: any) {
          responseBody = {
            jsonrpc: '2.0',
            id: responseBody.id,
            error: {
              code: JsonrpcErrorCode.InternalError,
              message: 'the response interceptors throw error',
              data: error.stack,
            },
          };
        }
      }

      if (responseBody == null) return;
      receiveHandler.call({}, responseBody);
    };
    return this.messageReceiver.call({}, messageHandler);
  };
}
