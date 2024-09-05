// SPDX-License-Identifier: Unlicensed (C)


/**
    * @dev this is the factory contract launching awesome

 */

pragma solidity ^0.8.19;

import "./Token.sol";
import "./EventHandler.sol";

interface Ownership {
    function renounceOwnership() external;
}

contract Factory {

    address public eventHandler;
    address [] public deployedTokens;
    mapping (address => uint) launchIndexes;
    uint256 public launchIndex;
    address public owner;
    bool active;
    uint256 public fee;

    //bonding curve params forwarded to token
    uint256 public _a;
    uint256 public _b;

    constructor (uint256 fee_) {
        owner = msg.sender;
        fee = fee_;
    }

    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);


    function deployNewToken(address [] memory params, string memory name_, string memory symbol_, string memory description_, address _fee, uint256 buyAmount) external payable returns (address token){
        if(!active) {revert ("contract is not active yet");}
        if(fee > msg.value) {revert ERC20InsufficientBalance(msg.sender, msg.sender.balance, fee);}
        if(fee > msg.sender.balance) {revert ERC20InsufficientBalance(msg.sender, msg.sender.balance, fee);}

        token = address (new Token(
            params,
            name_,
            symbol_,
            description_,
            _a,
            _b,
            _fee
        ));

        deployedTokens.push(address(token));
        IEventHandler(eventHandler).updateCallers(address(token));
        ++launchIndex;
        launchIndexes[token] = launchIndex;

       
       if(buyAmount > 0){
            //uint256 buyFee = buyAmount * 5 / 1000;
            IToken(token).devBuy{value: buyAmount /*+ buyFee*/ }(buyAmount, msg.sender);
        } 
    

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

    function setA (uint256 a) external {
        require(msg.sender == owner, "only the owner can call this function");
        _a = a;
    }

    function setB (uint256 b) external {
        require(msg.sender == owner, "only the owner can call this function");
        _b = b;
    }





}