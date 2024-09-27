<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$servername = "localhost";
$username = "p";
$password = "1234";
$dbname = "osk";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

if (isset($_POST['input'])) {
    $input = $conn->real_escape_string($_POST['input']);
    $sql = "INSERT INTO user_inputs (input_value) VALUES ('$input')";

    if ($conn->query($sql) === TRUE) {
        echo "Input saved successfully";
    } else {
        echo "Error: " . $sql . "<br>" . $conn->error;
    }
} else {
    echo "No input received";
}

$conn->close();
    ?>