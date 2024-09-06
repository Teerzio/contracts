// SPDX-License-Identifier: Unlicensed (C)

pragma solidity ^0.8.19;

/**

                                        created using

oooooooooo                                            oooo                              oooo 
 888    888   ooooooo    oooooooo8   ooooooooo8  ooooo888 ooooooooo     ooooooo    ooooo888  
 888oooo88    ooooo888  888ooooooo  888oooooo8 888    888  888    888   ooooo888 888    888  
 888    888 888    888          888 888        888    888  888    888 888    888 888    888  
o888ooo888   88ooo88 8o 88oooooo88    88oooo888  88ooo888o 888ooo88    88ooo88 8o  88ooo888o 
                                                          o888                                                    
 
*/


abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}
contract Ownable is Context {
    address public _owner;

    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    constructor () {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function _checkOwner() internal view virtual {
        if (_owner != _msgSender()) revert OwnableUnauthorizedAccount(_msgSender());
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);

}

interface IERC20Errors {
    /**
     * @dev Indicates an error related to the current `balance` of a `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     * @param balance Current balance for the interacting account.
     * @param needed Minimum amount required to perform a transfer.
     */
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);

    /**
     * @dev Indicates a failure with the token `sender`. Used in transfers.
     * @param sender Address whose tokens are being transferred.
     */
    error ERC20InvalidSender(address sender);

    /**
     * @dev Indicates a failure with the token `receiver`. Used in transfers.
     * @param receiver Address to which tokens are being transferred.
     */
    error ERC20InvalidReceiver(address receiver);

    /**
     * @dev Indicates a failure with the `spender`’s `allowance`. Used in transfers.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     * @param allowance Amount of tokens a `spender` is allowed to operate with.
     * @param needed Minimum amount required to perform a transfer.
     */
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);

    /**
     * @dev Indicates a failure with the `approver` of a token to be approved. Used in approvals.
     * @param approver Address initiating an approval operation.
     */
    error ERC20InvalidApprover(address approver);

    /**
     * @dev Indicates a failure with the `spender` to be approved. Used in approvals.
     * @param spender Address that may be allowed to operate on tokens without being their owner.
     */
    error ERC20InvalidSpender(address spender);
}

abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

interface IUniswapV2Factory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);

    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function setFeeTo(address) external;
    function setFeeToSetter(address) external;
}

interface IUniswapV2Router01 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountToken, uint amountETH);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);

    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}

interface IUniswapV2Router02 is IUniswapV2Router01 {
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountETH);
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

interface IEventHandler {
        function emitCreationEvent(address owner, address tokenAddress, string memory name, string memory symbol, string memory description) external;
        function emitBuyEvent(address buyer, address tokenAddress, uint256 amountToken, uint256 tokenPriceBefore, uint256 lastTokenPrice, uint256 amountETH, uint256 contractTokenBalance, uint256 userTokenBalance) external;
        function emitSellEvent(address seller, address tokenAddress, uint256 amountToken, uint256 tokenPriceBefore, uint256 lastTokenPrice, uint256 amountETH, uint256 contractTokenBalance, uint256 userTokenBalance) external;
        function emitLaunchedOnUniswap(address tokenAddress, address pairAddress, uint256 amountETHToLiq, uint256 amountTokensToLiq) external;
        function updateCallers(address newCaller) external;
}

interface IToken {
    
    function buy(uint256 buyAmount) external payable;
    function devBuy(uint256 buyAmount, address dev)external payable;
    function sell(uint256 tokenAmount) external payable;
}



contract Token is Context, IERC20, IERC20Errors, ReentrancyGuard, Ownable {
    
    bool public isLaunched;

    mapping(address account => uint256) private _balances;
    mapping(address account => mapping(address spender => uint256)) private _allowances;

    uint256 public _totalSupply; // the total supply of the token, which is 100,000
    uint256 private _availableSupply; // the max available amount of tokens on the bonding curve, which is 75,000. 25,000 tokens are reserved for the launch on DEX
    uint256 public _currentSupply; // the amount of tokens bought by users on the bonding curve.
    uint256 private _lastTokenPrice;


    string private _name;
    string private _symbol;
    string private _description;
    
    uint256 private a;
    uint256 private b;
    address private fee; //address to receive the trading fees

    IUniswapV2Factory private _IUniswapV2Factory;
    IUniswapV2Router02 private _IUniswapV2Router;
    IEventHandler private _IEventHandler;

    address private factory;

    error InsufficientTokenOutputAmount(uint256 tokensCalculated, uint256 tokensRequested);
    error InsufficientContractBalance(uint256 contractTokenBalance, uint256 tokensRequested);
    error InsufficientContractETHBalance(uint256 contractBalance, uint256 ETHRequested);
    error InsufficientETHOutputAmount(uint256 ETHCalculated, uint256 ETHRequested);
    error TokenAlreadyLaunched();
    error TokenNotLaunched();
    error InsufficientFunds();
    error InsufficientValue(uint256 valueSent, uint256 valueNeeded);
    error DevAlreadyBought();
    error OnlyFactory();

    /**
     * @dev Sets the values for {name} and {symbol}.
     *
     * All two of these values are immutable: they can only be set once during
     * construction.
     */
    constructor(address [] memory params, string memory name_, string memory symbol_, string memory description_, uint256 _a, uint256 _b, address _fee) {
        _IEventHandler = IEventHandler(params[0]);
        _IUniswapV2Factory = IUniswapV2Factory(params[1]);
        _IUniswapV2Router = IUniswapV2Router02(params[2]);
        factory = params[3];
        _name = name_;
        _symbol = symbol_;
        _description = description_;
        a = _a;
        b = _b;
        _totalSupply = 100_000 * 10 ** 18;
        _availableSupply = 75_000 * 10 ** 18;
        _balances[address(this)] = _totalSupply;
        fee = _fee;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the default value returned by this function, unless
     * it's overridden.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `value`.
     */
    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * NOTE: If `value` is the maximum `uint256`, the allowance is not updated on
     * `transferFrom`. This is semantically equivalent to an infinite approval.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Skips emitting an {Approval} event indicating an allowance update. This is not
     * required by the ERC. See {xref-ERC20-_approve-address-address-uint256-bool-}[_approve].
     *
     * NOTE: Does not update the allowance if the current allowance
     * is the maximum `uint256`.
     *
     * Requirements:
     *
     * - `from` and `to` cannot be the zero address.
     * - `from` must have a balance of at least `value`.
     * - the caller must have allowance for ``from``'s tokens of at least
     * `value`.
     */
    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(from, to, value);
    }

    /**
     * @dev Transfers a `value` amount of tokens from `from` to `to`, or alternatively mints (or burns) if `from`
     * (or `to`) is the zero address. All customizations to transfers, mints, and burns should be done by overriding
     * this function.
     *
     * Emits a {Transfer} event.
     */
    function _update(address from, address to, uint256 value) internal virtual {
        if(!isLaunched){
            revert TokenNotLaunched();
        }
        if (from == address(0)) {
            // Overflow check required: The rest of the code assumes that totalSupply never overflows
            _totalSupply += value; 
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                // Overflow not possible: value <= fromBalance <= totalSupply.
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                // Overflow not possible: value <= totalSupply or value <= fromBalance <= totalSupply.
                _totalSupply -= value;
            }
        } 
        else {
            unchecked {
                // Overflow not possible: balance + value is at most totalSupply, which we know fits into a uint256.
                _balances[to] += value;
            }
        }

        emit Transfer(from, to, value);
    }

    /**
     * @dev Creates a `value` amount of tokens and assigns them to `account`, by transferring it from address(0).
     * Relies on the `_update` mechanism
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead.
     */
    function _mint(address account, uint256 value) internal{
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    /**
     * @dev Destroys a `value` amount of tokens from `account`, lowering the total supply.
     * Relies on the `_update` mechanism.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * NOTE: This function is not virtual, {_update} should be overridden instead
     */
    function _burn(address account, uint256 value) internal{
        if (account == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        _update(account, address(0), value);
    }

    /**
     * @dev Sets `value` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     *
     * Overrides to this logic should be done to the variant with an additional `bool emitEvent` argument.
     */
    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    /**
     * @dev Variant of {_approve} with an optional flag to enable or disable the {Approval} event.
     *
     * By default (when calling {_approve}) the flag is set to true. On the other hand, approval changes made by
     * `_spendAllowance` during the `transferFrom` operation set the flag to false. This saves gas by not emitting any
     * `Approval` event during `transferFrom` operations.
     *
     * Anyone who wishes to continue emitting `Approval` events on the`transferFrom` operation can force the flag to
     * true using the following override:
     *
     * ```solidity
     * function _approve(address owner, address spender, uint256 value, bool) internal virtual override {
     *     super._approve(owner, spender, value, true);
     * }
     * ```
     *
     * Requirements are the same as {_approve}.
     */
    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }

    /**
     * @dev Updates `owner` s allowance for `spender` based on spent `value`.
     *
     * Does not update the allowance value in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Does not emit an {Approval} event.
     */
    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }

    // BONDING CURVE FUNCTIONS

    /**
        * @dev Bonding Curve Buy Function
        * 
        * allows an actor to buy the token directly from the contract.
        * minimumTokens provides the possibility to set slippage to the user.
        * amountETH is used to calculate the amount of tokens to buy after deducting a transaction fee of 0.5% on amountETH.
        * the function will revert if...
        *  - the token has already launched via launchOnUniswap()
        *  - the ETH-balance of the user is insufficient or msg.value is insufficient
        *  - the desired buy amount of tokens by the user exceeds the available supply
        * if the _currentSupply exceeds an amount of 65,000 tokens, the launchOnUniswap() will be triggered
        * the function calls the eventHandler contract to emit a buy event for this particular token.

     **/
    function buy (uint256 minimumTokens, uint256 amountETH) external payable nonReentrant{
        uint256 tokenPriceBefore = calcLastTokenPrice();
        uint256 feeETH = amountETH * 5 / 1000;
        uint256 tokenAmount = calcTokenAmount(amountETH - feeETH);

        //checks
        if (isLaunched){revert TokenAlreadyLaunched();}
        if (_msgSender().balance < amountETH){revert InsufficientFunds();}
        if (msg.value < amountETH){revert InsufficientValue(msg.value, amountETH + feeETH);}
        if(_currentSupply + tokenAmount > _availableSupply) {revert InsufficientContractBalance(_availableSupply - _currentSupply, tokenAmount);}
        if(tokenAmount < minimumTokens) {revert InsufficientTokenOutputAmount(tokenAmount, minimumTokens);}
        
        //effects
        _balances[address(this)] -= tokenAmount;
        _balances[_msgSender()] += tokenAmount;
        _currentSupply += tokenAmount;
        _lastTokenPrice = calcLastTokenPrice();
    
        // interactions
        (bool sendETH, ) = payable(address(this)).call{value: amountETH - feeETH }("");
        require(sendETH, "Failed to send buy Ether to contract");
        (bool sendFee, ) = payable(fee).call{value: feeETH}("");
        require(sendFee, "Failed to send buy fee Ether");


        if (_currentSupply > 65_000 * 10 ** 18 && !isLaunched) {
            launchOnUniswap();
        }
        
        _IEventHandler.emitBuyEvent(_msgSender(), address(this), tokenAmount, tokenPriceBefore, _lastTokenPrice, msg.value, _balances[address(this)], _balances[_msgSender()]);
         
    }

    /**
        * @dev Launch on DEX Function

        * will be triggered by the buy() function once the _currentSupply crosses 65,000 tokens.
        * creates the pair on Uniswap V2 and adds the amount of ETH held by the contract alongside 25,000 tokens.
        * calls the eventHandler contract to emit a Launch event.

     **/
    function launchOnUniswap() internal{
        _approve(address(this), address(_IUniswapV2Router), 25000*10**18);
        isLaunched = true;

        (uint256 amountToken, uint256 amountETH, ) =_IUniswapV2Router.addLiquidityETH{value: address(this).balance}(address(this), 25_000*10**18, 0, 0, address(0), block.timestamp);
        address pair = _IUniswapV2Factory.getPair(address(this), _IUniswapV2Router.WETH());

        if(address(this).balance > 0){
            (bool sendETH, ) = payable(fee).call{value: address(this).balance}("");
            require(sendETH, "Failed to send buy Ether to contract");
        }
        _IEventHandler.emitLaunchedOnUniswap(address(this), pair, amountETH, amountToken);

    }
    /**
        @dev Dev Buy Function to allow dev to buy tokens when creating it.
        * will be triggered by the factory when the token is created, should the dev enter a buy amount upon creation.
        * can only be called by the factory in the function call which creates the contract.
     */
    
    function devBuy (uint256 amountETH, address dev) external payable nonReentrant{        
        uint256 feeETH = amountETH * 5 / 1000;
        uint256 tokenAmount = calcTokenAmount(amountETH - feeETH);

        //checks
        if(_msgSender() != factory){revert OnlyFactory();}
        if (dev.balance < amountETH){revert InsufficientFunds();}
        if (msg.value < amountETH){revert InsufficientValue(msg.value, amountETH);}
        if(_totalSupply - _balances[address(this)] + tokenAmount > _availableSupply) {revert InsufficientContractBalance(_availableSupply - _balances[address(this)], tokenAmount);}
        
        //effects
        _balances[address(this)] -= tokenAmount;
        _balances[dev] += tokenAmount;
        _currentSupply += tokenAmount;
        _lastTokenPrice = calcLastTokenPrice();
    
        //interactions
        (bool sendETH, ) = payable(address(this)).call{value: amountETH - feeETH}("");
        require(sendETH, "Failed to send buy Ether to contract");
        (bool sendFee, ) = payable(fee).call{value: feeETH}("");
        require(sendFee, "Failed to send buy fee Ether");


        if (_currentSupply > 65_000 * 10 ** 18 && !isLaunched) {
            launchOnUniswap();
        }
        
        _IEventHandler.emitBuyEvent(dev, address(this), tokenAmount, a, _lastTokenPrice, msg.value, _balances[address(this)], _balances[_msgSender()]);
         
    }

    /**
        * @dev Bonding Curve Sell Function

        * allows an actor to sell the token back to the contract.
        * minETHAmount provides the possibility to set slippage to the user
        * tokenAmount is used to calculate the value of tokens in ETH.
        * the ETH sent out to the user is the amount calculated, after subtracting a 0.5% transaction fee
        * will revert if...
        *  - the token has already launched on a DEX
        *  - the token balance of the user is insufficient compared to the desired sell amount
        *  - the contracts ETH balance is less than the value of ETH to return to the user in exchange for the amount of tokens desired to sell.
        *  - the slippage set by the user is not met.
     */
    
    function sell(uint256 tokenAmount, uint256 minETHAmount) external payable nonReentrant{
        uint256 tokenPriceBefore = calcLastTokenPrice();
        uint256 amountETH = calcETHAmount(tokenAmount);
        uint256 feeETH = amountETH * 5 / 1000;

        //checks
        if (isLaunched){revert TokenAlreadyLaunched();}
        if (tokenAmount > balanceOf(_msgSender())) {revert ERC20InsufficientBalance(_msgSender(), balanceOf(_msgSender()), tokenAmount);}
        if (amountETH - feeETH > address(this).balance) {revert InsufficientContractETHBalance(address(this).balance, amountETH - feeETH);}
        if (amountETH - feeETH < minETHAmount){revert InsufficientETHOutputAmount(amountETH - feeETH, minETHAmount);}

        //effects
       _balances[_msgSender()] -= tokenAmount;
       _balances[address(this)] += tokenAmount;
       _currentSupply -= tokenAmount;
       _lastTokenPrice = calcLastTokenPrice();

        //interactions
        (bool sent, ) = payable(_msgSender()).call{value: amountETH - feeETH}("");
        require(sent, "Failed to send sell Ether to contract");
        if (address(this).balance < feeETH){
            (bool sentFee, ) = payable(fee).call{value: address(this).balance}("");
            require(sentFee, "Failed to send remaining sell fee Ether");
        }else{
            (bool sentFee, ) = payable(fee).call{value: feeETH}("");
            require(sentFee, "Failed to send sell fee Ether");
        }
        

        _IEventHandler.emitSellEvent(_msgSender(), address(this), tokenAmount, tokenPriceBefore, _lastTokenPrice, amountETH, _balances[address(this)], _balances[_msgSender()]);
    }   

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /** @dev calculates the token amount for a given ETH input
        * each token is priced at a + (currentSupply * b)
        * calcTokenAmount() returns the token amount to be sent to the buyer,
        * accounting for the per-token price increase, saving gas compared to using a loop.
    */
    function calcTokenAmount(uint256 buyAmountETH) public view returns (uint256 tokenAmount) {
        if(buyAmountETH == 0) {
            return 0;
        }

        uint256 currentSupply = _currentSupply / (10 **18);
        
        uint256 root = ((a + b * currentSupply + b/2)**2 + 2 * b * buyAmountETH);
        uint256 sol = sqrt(root);
        uint256 calcAmount = (sol - a - b * currentSupply + b/2)/b;

        return (calcAmount * 10 ** 18);
    }

 /** @dev calculates the ETH amount for a given token input
        * each token is priced at a + (currentSupply * b)
        * calcTokenAmount() returns the amount of ETH to be sent to the seller in return,
        * accounting for the per-token price decrease, saving gas compared to using a loop.
    */
    function calcETHAmount(uint256 sellAmountToken) public view returns (uint256) {
        if(sellAmountToken == 0) {
            return 0;
        }
        uint256 tokensToSell = sellAmountToken / (10 ** 18); // Convert to whole tokens
        uint256 currentSupply = _currentSupply / (10 ** 18); // Convert to whole tokens

        uint256 firstTerm = a + (currentSupply - 1) * b;
        uint256 lastTerm = a + (currentSupply - tokensToSell) * b;
        uint256 ETHToSend = tokensToSell * (firstTerm + lastTerm) / 2;

        return ETHToSend;
    }
    
    // Function to calculate the price of the last minted token
    function calcLastTokenPrice() public view returns (uint256) {
        return (a + ((_currentSupply) * b)) / (10 ** 18);
}

    receive () external payable {}
    fallback () external payable {}

}