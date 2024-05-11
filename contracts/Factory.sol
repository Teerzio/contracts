// SPDX-License-Identifier: Unlicensed (C)


pragma solidity ^0.8.19;

import "./Token.sol";
import "./EventHandler.sol";

interface Ownership {
    function renounceOwnership() external;
}

contract Factory is Ownable{

    address eventHandler;
    address [] public deployedTokens;
    address owner;
    bool active;
    uint256 fee;

    //bonding curve params forwarded to token
    uint256 _a;
    uint256 _b;

    constructor (uint256 fee_) {
        owner = _msgSender();
        fee = fee_;
    }

    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);


    function deployNewToken(uint256 buyAmount, address _eventHandler, string memory name_, string memory symbol_, string memory description_) external payable returns (address token){
        if(!active) {revert ("contract is not active yet");}
        if(buyAmount + fee > msg.value) {revert ERC20InsufficientBalance(_msgSender(), _msgSender().balance, buyAmount + fee);}
        if(buyAmount + fee > _msgSender().balance) {revert ERC20InsufficientBalance(_msgSender(), _msgSender().balance, buyAmount + fee);}

        token = address (new ModulusToken(
            _eventHandler,
            name_,
            symbol_,
            description_,
            _a,
            _b
        ));

        deployedTokens.push(address(token));
        IEventHandler(eventHandler).updateCallers(address(token));

        if(buyAmount > 0){
            IModulusToken(token).buy(buyAmount);
            IERC20(token).transfer(_msgSender(), buyAmount);
        }

        (bool sentFee, ) = payable(owner).call{value: fee}("");
        require(sentFee, "Failed to send Ether");

        Ownership(token).renounceOwnership();

    }

    function changeOwner() external {
        require(_msgSender() == owner, "only the owner can call this function");
        owner = _msgSender();
    }

    function setEventHandler(address eventHandler_) external {
        require(_msgSender() == owner, "only the owner can call this function");
        eventHandler = eventHandler_;
    }

    function setActive() external {
        require(_msgSender() == owner, "only the owner can call this function");
        active = true;
    }





}