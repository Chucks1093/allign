// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GiftEscrow} from "../src/GiftEscrow.sol";

contract Deploy is Script {
    function run() external {
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        vm.startBroadcast();
        GiftEscrow escrow = new GiftEscrow(operator);
        console.log("GiftEscrow deployed at:", address(escrow));
        vm.stopBroadcast();
    }
}
