// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SponsorPaymaster} from "../src/SponsorPaymaster.sol";
import {MockApprover, RevertingApprover} from "./MockApprover.sol";

contract SponsorPaymasterTest is Test {
    event Approved(uint256 scope);

    function test_approvesPaymentScope() public {
        SponsorPaymaster pm = new SponsorPaymaster{value: 0.01 ether}(address(new MockApprover()));
        vm.expectEmit(address(pm));
        emit Approved(1); // scope 1 = PAYMENT
        (bool ok, ) = address(pm).call("");
        assertTrue(ok);
    }

    // BALANCE/SELFBALANCE are banned for an unstaked entity, so the validation code must not check its own balance.
    function test_approvesWithoutAnyBalanceCheck() public {
        SponsorPaymaster pm = new SponsorPaymaster(address(new MockApprover()));
        (bool ok, ) = address(pm).call("");
        assertTrue(ok);
    }

    function test_revertsWhenApprovalFails() public {
        SponsorPaymaster pm = new SponsorPaymaster(address(new RevertingApprover()));
        (bool ok, ) = address(pm).call("");
        assertFalse(ok);
    }
}
