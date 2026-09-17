// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PreLectureRegistry
/// @notice Stores tamper-evident classroom, enrollment, and teacher-approval proofs.
/// @dev Lesson content stays off-chain; only deterministic hashes are recorded.
contract PreLectureRegistry {
    struct Classroom {
        address teacher;
        bool active;
    }

    mapping(bytes32 => Classroom) public classrooms;
    mapping(bytes32 => mapping(address => bool)) public enrolled;
    mapping(bytes32 => mapping(bytes32 => bytes32)) public approvedContentHash;

    event ClassroomCreated(bytes32 indexed classroomId, address indexed teacher);
    event StudentEnrolled(bytes32 indexed classroomId, address indexed student);
    event PreviewApproved(
        bytes32 indexed classroomId,
        bytes32 indexed topicId,
        bytes32 contentHash,
        address indexed teacher
    );

    function createClassroom(bytes32 classroomId) external {
        require(classrooms[classroomId].teacher == address(0), "Classroom exists");
        classrooms[classroomId] = Classroom(msg.sender, true);
        emit ClassroomCreated(classroomId, msg.sender);
    }

    function enroll(bytes32 classroomId) external {
        require(classrooms[classroomId].active, "Unknown classroom");
        enrolled[classroomId][msg.sender] = true;
        emit StudentEnrolled(classroomId, msg.sender);
    }

    function approvePreview(
        bytes32 classroomId,
        bytes32 topicId,
        bytes32 contentHash
    ) external {
        require(classrooms[classroomId].teacher == msg.sender, "Teacher only");
        approvedContentHash[classroomId][topicId] = contentHash;
        emit PreviewApproved(classroomId, topicId, contentHash, msg.sender);
    }
}
