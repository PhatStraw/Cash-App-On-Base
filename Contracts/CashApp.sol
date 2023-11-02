// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract CashApp {
    // Used to display the wallets cashTag on the frontend
    mapping(address => string) public addressToCashtag;

    // Mapping of cashTags to addresses
    mapping(string => address) public cashtag;

    // Mapping of cashTags to balances
    mapping(string => uint256) public balances;

    // Struct to represent a message
    struct Message {
        string content;
        string sender;
        string receiver;
    }

    // Event emitted when a message is sent
    event MessageSent(string content, string sender, string receiver);

    // Array to store messages
    Message[] public messages;

    constructor() {
    }

    // Function to make a payment
    function pay(string memory _cashtag, string memory _from, string memory _message) public payable {
        // Require that the payment value is greater than 0
        require(msg.value > 0, "Can't Pay 0 Eth");

        // Require that the cashTag being paid to is registered
        require(cashtag[_cashtag] != address(0), "CashTag Not Registered");

        // Require that the cashTag making the payment is registered
        require(cashtag[_from] != address(0), "CashTag Not Registered");

        // Require that the cashTag making the payment is registered to the message sender
        require(cashtag[_from] == address(msg.sender), "CashTag Not Registered To Msg.Sender");

        // Increase the balance of the recipient cashTag
        balances[_cashtag] += msg.value;

        // If a message is provided, create a new message and add it to the messages array
        if (bytes(_message).length > 0) {
            Message memory newMessage = Message(_message, _from, _cashtag);
            messages.push(newMessage);
            emit MessageSent(_message, _from, _cashtag);
        }
    }

    // Function to register a cashTag
    function register(string memory _cashtag) public {
        // Require that the cashTag is not already registered
        require(cashtag[_cashtag] == address(0), "CashTag Already Registered");

        // Register the cashTag to the message sender's address
        cashtag[_cashtag] = msg.sender;

        // Associate the cashTag with the message sender's address
        addressToCashtag[msg.sender] = _cashtag;
    }

    // Function to withdraw funds from a cashTag
    function withdrawl(string memory _cashtag) public {
        // Require that the cashTag is registered to the message sender
        require(cashtag[_cashtag] == address(msg.sender), "CashTag Not Registered To Msg.Sender");

        // Require that the cashTag has a positive balance
        require(balances[_cashtag] > 0, "Must have a balance to withdraw");

        // Transfer the balance of the cashTag to the message sender
        (bool success, ) = address(msg.sender).call{ value: balances[_cashtag] }("");
        require(success, "Failed to send Ether");

        // Set the balance of the cashTag to 0
        balances[_cashtag] = 0;
    }

    // Fallback function to receive Ether
    receive() external payable {}
}