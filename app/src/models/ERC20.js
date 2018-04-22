import { computed } from 'mobx'
import { createTransformer } from 'mobx-utils'
import BN from 'bn.js'

import ERC20Artifact from '../artifacts/DetailedERC20.json'

import RootStore from '../store/RootStore'

import {
  asyncComputed,
  createFromEthereumBlock,
} from '../util'

export default class ERC20 {
  contract = null

  constructor (at) {
    this.contract = new RootStore.web3Context.web3.eth.Contract(
      ERC20Artifact.abi,
      at
    )
  }

  @computed get address () {
    return this.contract._address
  }

  name = asyncComputed('...', async () => {
    try {
      const name = await this.contract.methods.name().call()
      if (!name) { throw new Error() }
      return name
    } catch (error) {
      return 'Invalid Token'
    }
  })

  @computed get shortName () {
    return this.name.current().length > 40
      ? `${this.name.current().substring(0, 40)}…`
      : this.name.current()
  }

  symbol = asyncComputed('...', async () => {
    try {
      const symbol = await this.contract.methods.symbol().call()
      if (!symbol) { throw new Error() }
      return symbol
    } catch (error) {
      return '⚠'
    }
  })

  @computed get shortSymbol () {
    return this.symbol.current().length > 6
      ? `${this.symbol.current().substring(0, 6)}…`
      : this.symbol.current()
  }

  balanceOf = createTransformer(
    (address) => createFromEthereumBlock(
      RootStore.web3Context.latestBlock
    )(
      new BN(0),
      () => {},
      async () => {
        try {
          const balance = await this.contract.methods.balanceOf(address).call()
          if (!balance) { throw new Error() }
          return new BN(balance)
        } catch (error) {
          return new BN(0)
        }
      }
    )
  )

  allowance = createTransformer(
    ({ owner, spender }) => createFromEthereumBlock(
      RootStore.web3Context.latestBlock
    )(
      new BN(0),
      () => {},
      async () => {
        try {
          console.log('ask for allowance')
          const allowance = await this.contract.methods.allowance(owner, spender).call()
          if (!allowance) { throw new Error() }
          return new BN(allowance)
        } catch (error) {
          return new BN(0)
        }
      }

    )
  )

  isApproved = createTransformer(
    (opts) => this.allowance(opts).current().gt(new BN(0))
  )

  @computed get info () {
    return {
      busy: this.name.busy() || this.symbol.busy(),
      name: this.name.current(),
      symbol: this.symbol.current(),
      address: this.address,
    }
  }
}
