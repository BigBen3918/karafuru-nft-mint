// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";

contract Withdrawable is Ownable {
    constructor() {}

    function withdrawAll() external onlyOwner {
        require(address(this).balance > 0, "Withdrawble: No amount to withdraw");
        payable(msg.sender).transfer(address(this).balance);
    }
}