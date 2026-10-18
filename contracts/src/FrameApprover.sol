// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Solidity cannot emit the EIP-8141 APPROVE opcode (0xaa) from inline assembly, so contracts approve
/// by delegatecalling a tiny raw-bytecode "Approver" (runtime 0x60003560006000aa: it reads the scope
/// from calldata and executes APPROVE). Delegatecall keeps the caller as the executing account,
/// which is what APPROVE requires.
abstract contract FrameApprover {
    uint256 internal constant SCOPE_PAYMENT = 1;
    uint256 internal constant SCOPE_EXECUTION = 2;
    uint256 internal constant SCOPE_BOTH = 3;

    address internal immutable APPROVER;

    constructor(address approver_) {
        APPROVER = approver_;
    }

    function _approve(uint256 scope) internal {
        (bool ok, ) = APPROVER.delegatecall(abi.encode(scope));
        require(ok, "approve failed");
    }
}
