<?php

include 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $character_prompt = $data['prompt'] ?? '';
    $user_message = $data['message'] ?? '';
    $conversation = $data['conversation'] ?? [];
    $safety_mode = !empty($data['safetyMode']);

    if (empty($character_prompt) || empty($user_message)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['response' => 'Invalid request.']);
        exit;
    }

    if (empty($openai_api_key)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['response' => 'Server is missing API key.']);
        exit;
    }

    // Prompt sistem îmbunătățit pentru răspunsuri scurte & naturale
    $system_prompt = $character_prompt . "\n\nKeep it short, natural, and conversational, like a real phone chat. Maximum 2–3 sentences. Don't write long texts or essays. Be direct and engage the user. Stay in character.";
    if ($safety_mode) {
        $system_prompt .= "\n\nSafety: keep it family-friendly (PG-13). Avoid sexual content, hate/harassment, and self-harm instructions. If asked for disallowed content, refuse briefly and redirect the conversation in-character.";
    }

    $messages = [
        ['role' => 'system', 'content' => $system_prompt]
    ];
    foreach ($conversation as $msg) {
        if (!is_array($msg)) continue;
        $role = $msg['role'] ?? '';
        $content = $msg['content'] ?? '';
        if ($role !== 'user' && $role !== 'assistant') continue;
        if (!is_string($content) || $content === '') continue;
        $messages[] = ['role' => $role, 'content' => $content];
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
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);
    $ai_response = trim($result['choices'][0]['message']['content'] ?? 'Hm...');

    if ($http_code < 200 || $http_code >= 300) {
        $ai_response = 'Server error. Try again.';
    }

    header('Content-Type: application/json');
    echo json_encode(['response' => $ai_response]);
} else {
    http_response_code(405);
    echo 'Method Not Allowed';
}
?>