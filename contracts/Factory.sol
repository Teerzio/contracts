// SPDX-License-Identifier: Unlicensed (C)


  
// @dev this is the factory contract which is responsible for launching the tokens tradeable on the platform


pragma solidity ^0.8.19;

import "./Token.sol";
import "./EventHandler.sol";

interface Ownership {
    function renounceOwnership() external;
}

contract Factory {

    address public eventHandler; // handles all the events emitted by the bonding curves
    address [] public deployedTokens;
    mapping (address => uint) launchIndexes;
    uint256 public launchIndex;
    address public owner;
    bool active;
    uint256 public fee; // price for every token launch

    //bonding curve params forwarded to token
    uint256 public _fix;
    uint256 public _multiplicator;

    constructor (uint256 fee_) {
        owner = msg.sender;
        fee = fee_;
    }

    error InsufficientFunds(address sender, uint256 balance, uint256 needed);

    /**
        * @dev
        * main function of the contract. launches a token according to owner input.
        * also has the option to let the dev buy tokens on launch directly.
        * will store each token address launched, update the Eventhandler to allow deployed tokens to call its functions.
        * will renounce the ownership of each token deployed
    
     */
    function deployNewToken(address [] memory params, string memory name_, string memory symbol_, string memory description_, address _fee, uint256 buyAmount) external payable returns (address token){
        //checks
        if(!active) {revert ("contract is not active yet");}
        if(fee > msg.value) {revert InsufficientFunds(msg.sender, msg.sender.balance, fee);}
        if(fee > msg.sender.balance) {revert InsufficientFunds(msg.sender, msg.sender.balance, fee);}

        //effects
        token = address (new Token(
            params,
            name_,
            symbol_,
            description_,
            _fix,
            _multiplicator,
            _fee
        ));

        // store launched token
        deployedTokens.push(address(token));
        ++launchIndex;
        launchIndexes[token] = launchIndex;

        // declare deployed token as valid caller of the Eventhandler
        IEventHandler(eventHandler).updateCallers(address(token));

        // executes devbuy if amount input by dev is > 0
        if(buyAmount > 0){
            IToken(token).devBuy{ value: buyAmount }(buyAmount, msg.sender);
        } 
        
        // sends the fee to the owner
        (bool sentFee, ) = payable(owner).call{value: fee}("");
        require(sentFee, "Failed to send Ether");

    
        Ownership(token).renounceOwnership();
        IEventHandler(eventHandler).emitCreationEvent(msg.sender, address(token), name_, symbol_, description_);
    }

    function changeOwner(address _owner) external {
        require(msg.sender == owner, "only the owner can call this function");
        owner = _owner;
    }

    function setEventHandler(address eventHandler_) external {
        require(msg.sender == owner, "only the owner can call this function");
        eventHandler = eventHandler_;
    }

    function setActive() external {
        require(msg.sender == owner, "only the owner can call this function");
        active = true;
    }

    function setInactive() external {
         require(msg.sender == owner, "only the owner can call this function");
        active = false;
    }

    function setFix (uint256 fix) external {
        require(msg.sender == owner, "only the owner can call this function");
        _fix = fix;
    }

    function setMultiplicator (uint256 multiplicator) external {
        require(msg.sender == owner, "only the owner can call this function");
        _multiplicator = multiplicator;
    }





}