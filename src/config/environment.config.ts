import { Networks, rpc } from '@stellar/stellar-sdk';

/**
 * Get network configuration based on server URL
 * @param serverUrl - The Stellar server URL
 * @returns Network configuration object with server and passphrase
 */
function getNetworkConfig(serverUrl: string): {
  [key: string]: {
    server: rpc.Server;
    networkPassphrase: string;
  };
} {
  return {
    testnet: {
      server: new rpc.Server(serverUrl, { allowHttp: true }),
      networkPassphrase: Networks.TESTNET,
    },
    public: {
      server: new rpc.Server(serverUrl, { allowHttp: true }),
      networkPassphrase: Networks.PUBLIC,
    },
    futurenet: {
      server: new rpc.Server(serverUrl, { allowHttp: true }),
      networkPassphrase: Networks.FUTURENET,
    },
  };
}

export default getNetworkConfig;
