// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FrameApprover} from "./FrameApprover.sol";

/// A wallet that breaks a mempool rule on demand, to show the difference between mempools.
///
/// Same owner check as ExampleWallet. In addition, when the VERIFY frame carries non-empty `data`, the wallet
/// reads a storage slot of a contract it does not own (`FOREIGN`, runtime 0x6000545000: SLOAD slot 0).
/// That is a storage-rule violation:
///   - the canonical mempool (EIP-8141) rejects it: ethrex says `StorageReadNonSender`;
///   - the standard alt-mempool rejects it for an unstaked entity ("unstaked payer accessed … slot …")
///     and admits it once the wallet is staked.
/// Empty `data` is the clean path, used for the staking tx itself (a wallet must be admissible to stake).
contract ViolatingWallet is FrameApprover {
    address public immutable owner;
    address internal immutable SIGNER_READER;
    address internal immutable FOREIGN;

    constructor(address owner_, address approver_, address signerReader_, address foreign_) payable FrameApprover(approver_) {
        owner = owner_;
        SIGNER_READER = signerReader_;
        FOREIGN = foreign_;
    }

    fallback() external payable {
        (bool ok, bytes memory ret) = SIGNER_READER.staticcall("");
        require(ok && ret.length == 32 && abi.decode(ret, (address)) == owner, "bad signer");
        if (msg.data.length > 0) {
            (bool read, ) = FOREIGN.staticcall(""); // the violation
            read;
        }
        _approve(SCOPE_BOTH);
    }
}
