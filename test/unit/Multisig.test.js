const { assert, expect } = require("chai")
const { assertType } = require("graphql")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Multisig Tests", function () {
          let multisig, deployer, owner1, owner2, owner3
          let _to = "0x1a78B3162Da1649ABf191ef762A3216189F87A8D"
          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              owner1 = accounts[1]
              owner2 = accounts[2]
              owner3 = accounts[3]
              await deployments.fixture(["all"])
              multisig = await ethers.getContract("Multisig")
              // connect player like so:
              // multisig = await multisig.connect(owner)
          })

          describe("constructor", function () {
              it("properly makes the multisig with inputted parameters", async function () {
                  assert.equal(await multisig.getNumConfirmations(), 2)
                  assert.equal((await multisig.getOwners())[0], owner1.address)
                  assert.equal((await multisig.getOwners())[1], owner2.address)
                  assert.equal((await multisig.getOwners())[2], owner3.address)
              })
          })

          describe("createTransaction", function () {
              it("fails to create a new transaction from non-owner", async function () {
                  // https://github.com/TrueFiEng/Waffle/issues/95
                  await expect(
                      multisig.createTransaction(_to, ethers.utils.parseEther("0.2"), [])
                  ).to.be.revertedWith("Multisig__NotAnOwner")
              })

              it("creates a new transaction", async function () {
                  const ownerConnectedMultisig = await multisig.connect(owner1)
                  await expect(
                      ownerConnectedMultisig.createTransaction(
                          _to,
                          ethers.utils.parseEther("0.2"),
                          []
                      )
                  ).to.emit(multisig, "TranactionCreated")
                  const { 0: to } = await multisig.getTransactionInfo(0)
                  assert.equal(to, _to)
                  assert.equal(await multisig.getTransactionCount(), 1)
              })
          })
          describe("confirmTransaction", function () {
              it("confirms a transaction", async function () {
                  // const {
                  //     0: to,
                  //     1: value,
                  //     3: executed,
                  //     4: confirmations,
                  // } = await multisig.getTransactionInfo(0)

                  const ownerConnectedMultisig = await multisig.connect(owner1)
                  await ownerConnectedMultisig.createTransaction(
                      _to,
                      ethers.utils.parseEther("0.2"),
                      []
                  )
                  await expect(ownerConnectedMultisig.confirmTransaction(0)).to.emit(
                      multisig,
                      "TransactionConfirmed"
                  )
                  const { 4: confirmations } = await multisig.getTransactionInfo(0)
                  assert.equal(confirmations, 1)
                  const owner2ConnectedMultisig = await multisig.connect(owner2)
                  await owner2ConnectedMultisig.confirmTransaction(0)
                  const { 4: confirmations2 } = await multisig.getTransactionInfo(0)
                  assert.equal(confirmations2, 2)
              })
              it("fails to confirm on invalid transaction", async function () {
                  const ownerConnectedMultisig = await multisig.connect(owner1)
                  await expect(ownerConnectedMultisig.confirmTransaction(0)).to.be.revertedWith(
                      "Multisig__InvalidTransaction"
                  )
              })
          })
          describe("revokeConfirmation", function () {
              it("properly revokes a transaction confirmation", async function () {
                  const ownerConnectedMultisig = await multisig.connect(owner1)
                  await ownerConnectedMultisig.createTransaction(
                      _to,
                      ethers.utils.parseEther("0.2"),
                      []
                  )
                  await ownerConnectedMultisig.confirmTransaction(0)
                  await expect(ownerConnectedMultisig.revokeConfirmation(0)).to.emit(
                      multisig,
                      "ConfirmationRevoked"
                  )
                  const { 4: confirmations } = await multisig.getTransactionInfo(0)
                  assert.equal(confirmations, 0)
              })
              it("fails to revoke an invalid transaction", async function () {
                  const ownerConnectedMultisig = await multisig.connect(owner1)
                  await expect(ownerConnectedMultisig.revokeConfirmation(0)).to.be.revertedWith(
                      "Multisig__InvalidTransaction"
                  )
              })
          })
          describe("executeTransaction", function () {
              it("properly executes a transaction once confirmations are reached", async function () {
                  const ownerConnectedMultisig = await multisig.connect(owner1)
                  const txResponse = await owner1.sendTransaction({
                      to: multisig.address,
                      value: ethers.utils.parseEther("1.0"),
                  })
                  await ownerConnectedMultisig.createTransaction(
                      _to,
                      ethers.utils.parseEther("0.2"),
                      []
                  )
                  await ownerConnectedMultisig.confirmTransaction(0)
                  const owner2ConnectedMultisig = await multisig.connect(owner2)
                  await owner2ConnectedMultisig.confirmTransaction(0)
                  assert.equal(await multisig.getNumConfirmations(), 2)
                  await expect(ownerConnectedMultisig.executeTransaction(0)).to.emit(
                      multisig,
                      "TransactionExecuted"
                  )
              })
          })
      })
