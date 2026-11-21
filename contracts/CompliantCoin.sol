// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Koin ERC-20 sederhana + fitur kepatuhan: blacklist (dengan alasan) dan pause darurat.
/// Hanya owner (regulator) yang dapat menambahkan/menghapus blacklist dan pause/unpause kontrak.
contract CompliantCoin {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    uint256 public cap;
    address public owner;
    bool public paused;

    struct BlacklistInfo {
        bool blacklisted;
        string reason;
        uint256 since;
    }

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => BlacklistInfo) public blacklistInfo;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed holder,
        address indexed spender,
        uint256 value
    );
    event Blacklisted(
        address indexed account,
        string reason,
        uint256 timestamp
    );
    event Unblacklisted(address indexed account, uint256 timestamp);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    modifier onlyOwner() {
        require(msg.sender == owner, "Hanya owner");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        uint256 _cap
    ) {
        require(_cap > 0, "Cap harus > 0");
        require(_initialSupply <= _cap, "Supply awal melebihi cap");
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        cap = _cap * 10 ** decimals;
        _mint(msg.sender, _initialSupply * 10 ** decimals);
    }

    function isBlacklisted(address account) public view returns (bool) {
        return blacklistInfo[account].blacklisted;
    }

    // ===== Kepatuhan (khusus owner / regulator) =====
    function blacklist(
        address account,
        string calldata reason
    ) external onlyOwner {
        require(account != owner, "Owner tidak boleh di-blacklist");
        require(!isBlacklisted(account), "Sudah di-blacklist");
        require(
            bytes(reason).length > 0 && bytes(reason).length <= 100,
            "Alasan wajib (1-100 karakter)"
        );
        blacklistInfo[account] = BlacklistInfo(true, reason, block.timestamp);
        emit Blacklisted(account, reason, block.timestamp);
    }

    function unblacklist(address account) external onlyOwner {
        require(isBlacklisted(account), "Tidak sedang di-blacklist");
        delete blacklistInfo[account];
        emit Unblacklisted(account, block.timestamp);
    }

    function pause() external onlyOwner {
        require(!paused, "Sudah paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(paused, "Tidak sedang paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    // ===== Token =====
    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "Alamat tujuan tidak valid");
        require(!isBlacklisted(to), "Penerima di-blacklist");
        require(totalSupply + amount <= cap, "Melebihi cap");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        require(!paused, "Transfer dibekukan (paused)");
        require(!isBlacklisted(msg.sender), "Pengirim di-blacklist");
        require(balanceOf[msg.sender] >= amount, "Saldo tidak cukup");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        require(!isBlacklisted(msg.sender), "Pemanggil di-blacklist");
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "Allowance tidak cukup");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(!paused, "Transfer dibekukan (paused)");
        require(!isBlacklisted(from), "Pengirim di-blacklist");
        require(!isBlacklisted(to), "Penerima di-blacklist");
        require(to != address(0), "Alamat tujuan tidak valid");
        require(balanceOf[from] >= amount, "Saldo tidak cukup");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}
