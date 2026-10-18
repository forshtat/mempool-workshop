// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FrameApprover} from "./FrameApprover.sol";

/// Minimal single-owner smart contract wallet for EIP-8141.
///
/// It contains no ECDSA code. The tx carries a SECP256K1 signature entry whose `signer` is the owner;
/// the protocol verifies that signature before any frame runs. The wallet's VERIFY frame only has to
/// confirm that the signer the protocol verified is its owner, then approve execution and payment.
/// The raw `SignerReader` helper (runtime 0x60006000b460005260206000f3) returns SIGPARAM(0, RESOLVED_SIGNER).
///
/// Fund it through the `value` of its creation: a plain transfer would run the fallback below,
/// which needs a frame context and fails.
contract ExampleWallet is FrameApprover {
    address public immutable owner;
    address internal immutable SIGNER_READER;

    constructor(address owner_, address approver_, address signerReader_) payable FrameApprover(approver_) {
        owner = owner_;
        SIGNER_READER = signerReader_;
    }

    /// The VERIFY frame whose target is this wallet lands here.
    fallback() external payable {
        (bool ok, bytes memory ret) = SIGNER_READER.staticcall("");
        require(ok && ret.length == 32 && abi.decode(ret, (address)) == owner, "bad signer");
        _approve(SCOPE_BOTH);
    }
}
