// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ViolatingWallet} from "../src/ViolatingWallet.sol";
import {MockApprover, MockSignerReader, MockForeign} from "./MockApprover.sol";

contract ViolatingWalletTest is Test {
    address owner = address(0xA11CE);
    ViolatingWallet w;
    address foreign;

    function setUp() public {
        foreign = address(new MockForeign());
        w = new ViolatingWallet(owner, address(new MockApprover()), address(new MockSignerReader(owner)), foreign);
    }

    function test_cleanFrameDataDoesNotReadForeignStorage() public {
        vm.expectCall(foreign, "", 0); // exactly zero calls
        (bool ok, ) = address(w).call("");
        assertTrue(ok);
    }

    function test_nonEmptyFrameDataReadsForeignStorage() public {
        vm.expectCall(foreign, "", 1);
        (bool ok, ) = address(w).call(hex"01");
        assertTrue(ok);
    }

    function test_rejectsOtherSignerEvenOnTheCleanPath() public {
        ViolatingWallet other = new ViolatingWallet(owner, address(new MockApprover()), address(new MockSignerReader(address(0xBAD))), foreign);
        (bool ok, ) = address(other).call("");
        assertFalse(ok);
    }
}
