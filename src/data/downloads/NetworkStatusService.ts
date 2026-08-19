import * as Network from "expo-network";
export class NetworkStatusService {
  async isConnected(): Promise<boolean> { const state = await Network.getNetworkStateAsync(); return state.isConnected === true && state.isInternetReachable !== false; }
  async assertConnected(): Promise<void> { if (!(await this.isConnected())) throw new Error("Sem conexão com a internet."); }
}
