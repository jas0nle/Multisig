const { assert, expect } = require("chai")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Multisig Tests", function () {
          let multisig, deployer, owner1, owner2, owner3
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

          describe("listItem", function () {
              it("lists and can be bought", async function () {})
          })
      })
