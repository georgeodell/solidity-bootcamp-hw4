import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ethers } from 'ethers';

import tokenJson from '../assets/MyToken.json';
import ballotJson from '../assets/Ballot.json';
import { environment } from 'src/environments/environment';

export class claimTokensDTO {
  constructor(public address: string, public amount: string) {
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  provider: ethers.providers.Provider;
  wallet: ethers.Wallet | undefined;
  tokenAddress: string | undefined;
  tokenContract: ethers.Contract | undefined;
  ballotContract: ethers.Contract | undefined;

  ethBalance: number | string | undefined;
  tokenBalance: number | string | undefined;
  votePower: number | string | undefined;

  proposals: any[] | undefined;
  NO_OF_PROPOSALS = 3; // TODO: dynamic amount of proposals
  ballotVotePower: number | string | undefined;

  constructor(private http: HttpClient) {
    this.provider = ethers.getDefaultProvider("goerli", {
      etherscan: environment['ETHERSCAN_API_KEY'],
      infura: environment['INFURA_API_KEY'],
      alchemy: environment['ALCHEMY_API_KEY']
  });
    this.http.get<any>('http://localhost:3000/token-address').subscribe((ans) => {
      this.tokenAddress = ans.result;
    });
  }

  createWallet() {
    this.wallet = ethers.Wallet.createRandom().connect(this.provider);
    if (this.tokenAddress) {
      this.tokenContract = new ethers.Contract(this.tokenAddress, tokenJson.abi, this.wallet);
    }
    this.updateValues();
  }

  updateValues() {
    [this.ethBalance, this.tokenBalance, this.votePower, this.ballotVotePower] = ["LOADING...", "LOADING...", "LOADING...", "LOADING..."];
    this.wallet?.getBalance().then((balanceBN) => {
      this.ethBalance = parseFloat(ethers.utils.formatUnits(balanceBN, "wei"));
    })
    if (this.tokenContract) {
      this.tokenContract["balanceOf"](this.wallet?.address).then((balanceBN: ethers.BigNumberish) => {
        this.tokenBalance = parseFloat(ethers.utils.formatUnits(balanceBN, "wei"));
      });
      this.tokenContract["getVotes"](this.wallet?.address).then((votePowerBN: ethers.BigNumberish) => {
        this.votePower = parseFloat(ethers.utils.formatUnits(votePowerBN, "wei"));
      });
    }
    if (this.ballotContract) {
      this.ballotContract["votePower"](this.wallet?.address).then((votePowerBN: ethers.BigNumberish) => {
        this.ballotVotePower = parseFloat(ethers.utils.formatUnits(votePowerBN, "wei"));
      });

      this.proposals = [];
      for (let i = 0; i < this.NO_OF_PROPOSALS; i++) {
        this.ballotContract["proposals"](i).then((proposal: any) => {
          this.proposals?.push({ name: ethers.utils.parseBytes32String(proposal.name), voteCount: proposal.voteCount });
        });
      }
    }
  }

  importWallet(privateKey: string) {
    // TODO (optional): make this.wallet to be imported from the privateKey or mnemonic seed
    this.updateValues();
  }

  requestTokens(requestAmount: string) {
    this.tokenBalance = "LOADING...";

    const body = new claimTokensDTO(this.wallet?.address ?? "", requestAmount);
    this.http.post<any>('http://localhost:3000/claim-tokens', body).subscribe(async (ans) => {
      const txHash = ans.result;
      const tx = await this.provider.getTransaction(txHash);
      await tx.wait();
      this.updateValues();
    });
  }

  connectBallot(ballotAddress: string) {
    
    this.ballotContract = new ethers.Contract(ballotAddress, ballotJson.abi, this.wallet?.connect(this.provider));

    this.updateValues();
  }

  getProposal(proposalIndex: number) {
    if (this.proposals) {
      return this.proposals[proposalIndex];
    } else {
      return null;
    }
  }

  vote(proposalIndex: string, voteAmount: string) {
    this.ballotVotePower = 'LOADING...';

    if (this.ballotContract) {
      this.ballotContract["vote"](parseFloat(proposalIndex), parseFloat(voteAmount)).then(() => {
        this.updateValues();
      });
    }
  }

  delegate(delegatee: string) {
    this.votePower = 'LOADING...';

    if (this.tokenContract) {
      this.tokenContract["delegate"](delegatee).then(() => {
        this.updateValues();
      });
    }
  }
}
