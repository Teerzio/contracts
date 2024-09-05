# Basedpad
## Premise
The protocol is designed to allow permissionless launches of tokens by users. These tokens are then tradeable on the platform. After a certain threshold is reached, the token automatically launches on a DEX.

## Smart Contracts
### Factory
The Factory contract is not doing anything fancy. It´s purpose is to deploy tokens according to user input. It also sets the bonding curve parameters on the token, which can be altered by the owner of the Factory. The Factory automatically renounces the ownership of the token when it is created.

### Token
#### General Functionality
The Token contract uses the base of a regular ERC-20 Token with a totalSupply of $100,000$ tokens, but is modified with the Bonding Curve Functions (buy(), sell(), launchOnUniswap()). Each token can be transferred without any restriction at all times. Calling the buy()- function will transfer the calculated amount of tokens to the buyer and collect the ETH paid by the buyer. the sell()- function in reverse will just do the opposite. If the Token contract sells more than $65,000$ tokens, the launchOnUniswap() function will be triggered by the buy that pushes the sold amount above 65,000 tokens and all of the ETH collected by the Token contract will be sent to the DEX alongside $25,000$ tokens to create the trading pair. After the token has launched on a DEX, the buy()- and sell()- functions are not callable anymore.

#### Math
The buy()- and sell()- functions are calculating the token/ETH ratios on the buys and sells based on the price function

```math 
     p = a + (currentSupply * b)
```


Accordingly, to calculate the amount of tokens a user gets in return for a given amount of ETH while taking a price increase per token into account, the formula below is used:

```math
\text{tokenAmount} = \frac{\sqrt{\left(\frac{a + b \cdot \text{currentSupply} + \frac{b}{2}}{b}\right)^2 + 2 \cdot b \cdot \text{buyAmountETH}} - a - b \cdot \text{currentSupply} + \frac{b}{2}}{b}
```


In reverse, to calculate the amount of ETH a user will get, the following formula is used:

```math
\text{ETHAmount} = \text{sellAmountToken} \cdot \left( \left( a + ( \text{currentSupply} - 1 ) \cdot b \right) \cdot \left( a + ( \text{currentSupply} - \text{sellAmountToken} ) \cdot b \right) \right)
```

The first token will be priced at $0.0000010005 ETH$, while the $65,000th$ token (last token sold before launching on DEX) is priced at $0.0000335 ETH$, meaning roughly a 33x from deployment to launch on Uniswap.

With the threshold for a launch on Uniswap being set to $65,000$ tokens sold, with $a = 0.000001$ and $b = 0.0000000005$, this leads to the contract having raised approx. $1.12 ETH$ being sent to the liquidity pool alongside $25,000$ tokens, leading to an intial DEX-price per token of $0.00004485 ETH$, which is slightly above the price of the last token sold on the bonding curve.


### Eventhandler
The Eventhandler contract is necessary to track all events related to the trading on the bonding curve, without the necessity to track every token on its own. Every token's buy()- and sell()- function will therefore call the Eventhandler, which will emit the corresponding event.



