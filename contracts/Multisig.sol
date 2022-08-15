//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

contract Multisig {
    event TranactionCreated(address sender, uint256 transactionCount, address to, uint256 value);
    event TransactionConfirmed(address sender, uint256 transactionNum, uint256 numConfirmations);
    event ConfirmationRevoked(address sender, uint256 transactionNum, uint256 numConfirmations);
    event TransactionExecuted(
        address sender,
        uint256 transactionNum,
        uint256 value,
        uint256 numConfirmations
    );

    // who the Owners are
    address[] public owners;

    uint256 public numConfirmations;

    mapping(address => bool) isOwner;
    mapping(uint256 => mapping(address => bool)) isConfirmed;
    mapping(uint256 => bool) isExecuted;

    // transaction details
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    // an array of transaction structs
    Transaction[] public transactions;

    // initializes the Owners of the wallet and the number of confirmations required
    constructor(address[] memory _owners, uint256 _numConfirmations) {
        require(
            _owners.length > 0 && _numConfirmations > 0 && _numConfirmations < _owners.length,
            "Invalid constructor arguments"
        );
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0) && !isOwner[owner], "Invalid owner");
            owners.push(owner);
        }
        numConfirmations = _numConfirmations;
    }

    // only the Owners can call
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner!");
        _;
    }

    // transaction is valid
    modifier validTxn(uint256 _transactionNum) {
        require(_transactionNum < transactions.length, "Invalid transaction");
        _;
    }

    receive() external payable {}

    // establishes a brand new transaction without any confirmers
    function createTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner {
        transactions.push(Transaction(_to, _value, _data, false, 0));
        emit TranactionCreated(msg.sender, transactions.length, _to, _value);
    }

    function confirmTransaction(uint256 _transactionNum)
        public
        onlyOwner
        validTxn(_transactionNum)
    {
        require(!isConfirmed[_transactionNum][msg.sender], "Already confirmed!");
        require(!isExecuted[_transactionNum], "Already executed!");
        isConfirmed[_transactionNum][msg.sender] = true;
        transactions[_transactionNum].numConfirmations++;
        emit TransactionConfirmed(
            msg.sender,
            _transactionNum,
            transactions[_transactionNum].numConfirmations
        );
    }

    function revokeCofirmation(uint256 _transactionNum) public onlyOwner validTxn(_transactionNum) {
        Transaction memory txn = transactions[_transactionNum];
        require(!txn.executed, "Transaction already executed");
        require(isConfirmed[_transactionNum][msg.sender], "Not confirmed!");
        isConfirmed[_transactionNum][msg.sender] = false;
        transactions[_transactionNum].numConfirmations--;
        emit ConfirmationRevoked(
            msg.sender,
            _transactionNum,
            transactions[_transactionNum].numConfirmations
        );
    }

    function executeTransaction(uint256 _transactionNum)
        public
        onlyOwner
        validTxn(_transactionNum)
    {
        require(!isExecuted[_transactionNum], "Already executed!");
        require(
            transactions[_transactionNum].numConfirmations >= numConfirmations,
            "Confirmation count not met!"
        );
        isExecuted[_transactionNum] = true;
        Transaction memory txn = transactions[_transactionNum];
        (bool sent, ) = txn.to.call{value: txn.value}(txn.data);
        require(sent, "Transaction failed!");
        emit TransactionExecuted(msg.sender, _transactionNum, txn.value, txn.numConfirmations);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransactionConfirmations(uint256 _transactionNum)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 confirmations
        )
    {
        Transaction memory txn = transactions[_transactionNum];
        return (txn.to, txn.value, txn.data, txn.executed, txn.numConfirmations);
    }

    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getNumConfirmations() public view returns (uint256) {
        return numConfirmations;
    }
}
