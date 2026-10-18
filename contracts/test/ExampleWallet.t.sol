// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ExampleWallet} from "../src/ExampleWallet.sol";
import {MockApprover, MockSignerReader} from "./MockApprover.sol";

contract ExampleWalletTest is Test {
    event Approved(uint256 scope);

    address owner = address(0xA11CE);
    address stranger = address(0xBAD);

    function test_acceptsOwnerSignature() public {
        ExampleWallet w = new ExampleWallet(owner, address(new MockApprover()), address(new MockSignerReader(owner)));
        vm.expectEmit(address(w));
        emit Approved(3); // scope 3 = execution and payment
        (bool ok, ) = address(w).call("");
        assertTrue(ok);
    }

    function test_rejectsOtherSigner() public {
        ExampleWallet w = new ExampleWallet(owner, address(new MockApprover()), address(new MockSignerReader(stranger)));
        (bool ok, ) = address(w).call("");
        assertFalse(ok);
    }
}
