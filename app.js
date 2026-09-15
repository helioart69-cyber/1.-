(() => {
  "use strict";

  const els = {
    liveDate: document.querySelector("#liveDate"),
    liveClock: document.querySelector("#liveClock"),
    timerCard: document.querySelector(".timer-card"),
    sessionStatus: document.querySelector("#sessionStatus"),
    countdown: document.querySelector("#countdown"),
    startButton: document.querySelector("#startButton"),
    resetButton: document.querySelector("#resetButton"),
    soundToggle: document.querySelector("#soundToggle"),
    jumpButton: document.querySelector("#jumpButton"),
    jumpCount: document.querySelector("#jumpCount"),
    minusJump: document.querySelector("#minusJump"),
    clearJumps: document.querySelector("#clearJumps"),
    paceBadge: document.querySelector("#paceBadge"),
    elapsedTime: document.querySelector("#elapsedTime"),
    remainingMini: document.querySelector("#remainingMini"),
    toast: document.querySelector("#toast")
  };

  let selectedSeconds = 60;
  let remainingSeconds = selectedSeconds;
  let elapsedSeconds = 0;
  let jumps = 0;
  let running = false;
  let soundEnabled = true;
  let timerId = null;
  let deadline = 0;
  let toastTimer = null;

  function formatTime(totalSeconds) {
    const safe = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function renderClock() {
    const now = new Date();
    els.liveClock.textContent = now.toLocaleTimeString("ko-KR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    els.liveDate.textContent = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  }

  function renderTimer() {
    els.countdown.textContent = formatTime(remainingSeconds);
    els.remainingMini.textContent = formatTime(remainingSeconds);
    els.elapsedTime.textContent = formatTime(elapsedSeconds);
    els.jumpCount.textContent = String(jumps);
    const minutes = elapsedSeconds / 60;
    const pace = minutes > 0 ? Math.round(jumps / minutes) : 0;
    els.paceBadge.textContent = `${pace}회/분`;
    els.timerCard.classList.toggle("running", running);
    els.startButton.textContent = running ? "잠시 멈춤" : (elapsedSeconds > 0 && remainingSeconds > 0 ? "계속하기" : "시작");
    els.sessionStatus.textContent = remainingSeconds === 0 ? "운동 완료!" : running ? "신나게 뛰는 중" : elapsedSeconds > 0 ? "잠시 쉬는 중" : "준비됐어요";
    document.querySelectorAll("[data-minutes]").forEach(button => {
      button.disabled = running || elapsedSeconds > 0;
      button.setAttribute("aria-pressed", String(Number(button.dataset.minutes) * 60 === selectedSeconds));
    });
  }

  function updateFromDeadline() {
    if (!running) return;
    const nextRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    elapsedSeconds = Math.min(selectedSeconds, selectedSeconds - nextRemaining);
    remainingSeconds = nextRemaining;
    renderTimer();
    if (remainingSeconds === 0) finishTimer();
  }

  function startTimer() {
    if (remainingSeconds === 0) resetTimer();
    running = true;
    deadline = Date.now() + remainingSeconds * 1000;
    clearInterval(timerId);
    timerId = setInterval(updateFromDeadline, 250);
    renderTimer();
    showToast("슈나우저와 함께 출발!");
    return getState();
  }

  function pauseTimer() {
    if (!running) return getState();
    updateFromDeadline();
    running = false;
    clearInterval(timerId);
    timerId = null;
    renderTimer();
    return getState();
  }

  function toggleTimer() {
    return running ? pauseTimer() : startTimer();
  }

  function resetTimer() {
    running = false;
    clearInterval(timerId);
    timerId = null;
    remainingSeconds = selectedSeconds;
    elapsedSeconds = 0;
    jumps = 0;
    renderTimer();
    showToast("기록을 초기화했어요.");
    return getState();
  }

  function finishTimer() {
    running = false;
    clearInterval(timerId);
    timerId = null;
    remainingSeconds = 0;
    elapsedSeconds = selectedSeconds;
    renderTimer();
    if (soundEnabled) playFinishSound();
    if (navigator.vibrate) navigator.vibrate([160, 80, 160]);
    showToast(`완료! 총 ${jumps}회 뛰었어요.`);
  }

  function selectDuration(minutes) {
    const value = Number(minutes);
    if (!Number.isInteger(value) || ![1, 3, 5, 10].includes(value)) throw new Error("1분, 3분, 5분, 10분 중에서 선택해 주세요.");
    if (running || elapsedSeconds > 0) throw new Error("운동을 초기화한 뒤 시간을 바꿀 수 있어요.");
    selectedSeconds = value * 60;
    remainingSeconds = selectedSeconds;
    renderTimer();
    return getState();
  }

  function addJump(amount = 1) {
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error("한 번에 1회부터 100회까지 추가할 수 있어요.");
    jumps += value;
    els.jumpButton.classList.add("pressed");
    setTimeout(() => els.jumpButton.classList.remove("pressed"), 90);
    renderTimer();
    return getState();
  }

  function subtractJump() {
    jumps = Math.max(0, jumps - 1);
    renderTimer();
  }

  function clearJumpCount() {
    jumps = 0;
    renderTimer();
    showToast("횟수를 지웠어요.");
    return getState();
  }

  function getState() {
    return { running, durationSeconds: selectedSeconds, remainingSeconds, elapsedSeconds, jumps };
  }

  function playFinishSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      [0, .18, .36].forEach((offset, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 660 + index * 110;
        gain.gain.setValueAtTime(.0001, context.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(.17, context.currentTime + offset + .02);
        gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + offset + .14);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + offset);
        oscillator.stop(context.currentTime + offset + .16);
      });
    } catch {}
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  document.querySelectorAll("[data-minutes]").forEach(button => {
    button.addEventListener("click", () => {
      try { selectDuration(Number(button.dataset.minutes)); } catch (error) { showToast(error.message); }
    });
  });

  els.startButton.addEventListener("click", toggleTimer);
  els.resetButton.addEventListener("click", resetTimer);
  els.jumpButton.addEventListener("click", () => addJump(1));
  els.minusJump.addEventListener("click", subtractJump);
  els.clearJumps.addEventListener("click", clearJumpCount);
  els.soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    els.soundToggle.setAttribute("aria-checked", String(soundEnabled));
    showToast(soundEnabled ? "종료 알림음을 켰어요." : "종료 알림음을 껐어요.");
  });

  document.addEventListener("keydown", event => {
    const target = event.target;
    if (event.code === "Space" && !(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLButtonElement)) {
      event.preventDefault();
      addJump(1);
    }
  });

  function registerWebMCP() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const tools = [
      {
        name: "set_jump_timer_duration",
        title: "줄넘기 시간 설정",
        description: "운동을 시작하기 전에 줄넘기 타이머 시간을 설정합니다.",
        inputSchema: { type: "object", properties: { minutes: { type: "integer", enum: [1, 3, 5, 10] } }, required: ["minutes"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) { return selectDuration(input?.minutes); }
      },
      {
        name: "start_jump_timer",
        title: "줄넘기 타이머 시작",
        description: "현재 설정된 줄넘기 타이머를 시작하거나 이어서 실행합니다.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute() { return startTimer(); }
      },
      {
        name: "record_jump_count",
        title: "줄넘기 횟수 기록",
        description: "현재 운동에 줄넘기 횟수를 추가합니다.",
        inputSchema: { type: "object", properties: { count: { type: "integer", minimum: 1, maximum: 100 } }, required: ["count"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) { return addJump(input?.count); }
      },
      {
        name: "read_jump_timer",
        title: "줄넘기 상태 보기",
        description: "현재 타이머와 줄넘기 기록을 조회합니다.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute() { return getState(); }
      }
    ];
    tools.forEach(tool => { try { void Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch {} });
  }

  renderClock();
  setInterval(renderClock, 1000);
  renderTimer();
  registerWebMCP();
})();
