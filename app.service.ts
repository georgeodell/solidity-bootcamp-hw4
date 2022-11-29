import { HttpException } from '@nestjs/common';
import { Injectable, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as tokenJson from './assets/MyToken.json';

const TOKEN_CONTRACT_ADDRESS = "0x43CC5d8D7dfE455FF7ADd6d6c152acA50DB4E978";

@Injectable()
export class AppService {
  provider: ethers.providers.BaseProvider;
  wallet: ethers.Wallet;
  signer: ethers.Signer;
  tokenContract: ethers.Contract;

  constructor(private configService: ConfigService) {
    this.provider = ethers.getDefaultProvider("goerli", {
      etherscan: this.configService.get<string>('ETHERSCAN_API_KEY'),
      infura: this.configService.get<string>('INFURA_API_KEY'),
      alchemy: this.configService.get<string>('ALCHEMY_API_KEY')
  });

    const privateKey = this.configService.get<string>('PRIVATE_KEY_1');
    this.wallet = new ethers.Wallet(privateKey);
    this.signer = this.wallet.connect(this.provider);

    this.tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, tokenJson.abi, this.signer); // check this works
  }

  getTokenAddress() {
    console.log('Getting token address...');

    console.log('DONE');
    return {result: TOKEN_CONTRACT_ADDRESS};
  }

  async claimTokens(address: string, amount: string) {
    console.log('Claiming tokens...')

    const claimAmount = ethers.utils.parseUnits(amount, "wei");

    const mintTx = await this.tokenContract.mint(address, claimAmount);
    const mintReceipt = await mintTx.wait();

    console.log('DONE.');
    return { result: mintReceipt.transactionHash };
  }
  
}
