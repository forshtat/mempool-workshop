// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Stand-in for the raw Approver (runtime 0x60003560006000aa). The test EVM has no APPROVE opcode,
/// so this emits the scope it was asked to approve. It runs via delegatecall, so the event is
/// attributed to the calling contract.
contract MockApprover {
    event Approved(uint256 scope);

    fallback() external payable {
        emit Approved(abi.decode(msg.data, (uint256)));
    }
}

/// Models APPROVE being executed outside a frame, which halts.
contract RevertingApprover {
    fallback() external payable {
        revert("not in a frame");
    }
}

/// Stand-in for the raw SignerReader (runtime 0x60006000b460005260206000f3, SIGPARAM(0, RESOLVED_SIGNER)).
contract MockSignerReader {
    address internal immutable SIGNER;

    constructor(address signer_) {
        SIGNER = signer_;
    }

    fallback() external payable {
        bytes memory out = abi.encode(SIGNER);
        assembly {
            return(add(out, 32), 32)
        }
    }
}

/// Stand-in for the Foreign helper (runtime 0x6000545000: SLOAD slot 0, POP, STOP). Tests observe calls to it with vm.expectCall.
contract MockForeign {
    fallback() external payable {}
}
