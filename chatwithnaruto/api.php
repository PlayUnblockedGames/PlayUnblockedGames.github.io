<?php

include 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $character_prompt = $data['prompt'];
    $user_message = $data['message'];
    $conversation = $data['conversation'] ?? [];

    // Prompt sistem îmbunătățit pentru răspunsuri scurte & naturale
    $system_prompt = $character_prompt . "\n\nKeep it short, natural, and conversational, like a real phone chat. Maximum 2–3 sentences. Don't write long texts or essays. Be direct and engage the user. Stay in character.";

    $messages = [
        ['role' => 'system', 'content' => $system_prompt]
    ];
    foreach ($conversation as $msg) {
        $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
    }
    $messages[] = ['role' => 'user', 'content' => $user_message];

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'model' => 'gpt-4o-mini',
        'messages' => $messages,
        'temperature' => 0.85,
        'max_tokens' => 100,
        'top_p' => 0.9
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $openai_api_key
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    $ai_response = trim($result['choices'][0]['message']['content'] ?? 'Hm...');

    echo json_encode(['response' => $ai_response]);
} else {
    http_response_code(405);
    echo 'Method Not Allowed';
}
?>