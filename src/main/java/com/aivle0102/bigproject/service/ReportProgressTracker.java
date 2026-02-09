package com.aivle0102.bigproject.service;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class ReportProgressTracker {

    private static final long DEFAULT_TIMEOUT_MS = 5 * 60 * 1000L;

    private static class ProgressState {
        private final int totalWeight;
        private int completedWeight;
        private int progress;
        private String stage;
        private String message;
        private Instant updatedAt;

        private ProgressState(int totalWeight) {
            this.totalWeight = Math.max(1, totalWeight);
            this.completedWeight = 0;
            this.progress = 0;
            this.stage = "start";
            this.message = "started";
            this.updatedAt = Instant.now();
        }

        private Map<String, Object> toPayload() {
            return Map.of(
                    "progress", progress,
                    "stage", stage,
                    "message", message,
                    "updatedAt", updatedAt.toString()
            );
        }
    }

    private final ConcurrentHashMap<String, ProgressState> states = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public void init(String jobId, int totalWeight) {
        if (jobId == null || jobId.isBlank()) {
            return;
        }
        states.put(jobId, new ProgressState(totalWeight));
        send(jobId, "start", "started");
    }

    public void step(String jobId, int deltaWeight, String stage, String message) {
        if (jobId == null || jobId.isBlank()) {
            return;
        }
        ProgressState state = states.get(jobId);
        if (state == null) {
            return;
        }
        state.completedWeight = Math.min(state.totalWeight, state.completedWeight + Math.max(0, deltaWeight));
        int nextProgress = (int) Math.floor((state.completedWeight * 100.0) / state.totalWeight);
        state.progress = Math.min(99, Math.max(state.progress, nextProgress));
        state.stage = stage;
        state.message = message;
        state.updatedAt = Instant.now();
        send(jobId, stage, message);
    }

    public void complete(String jobId) {
        if (jobId == null || jobId.isBlank()) {
            return;
        }
        ProgressState state = states.get(jobId);
        if (state == null) {
            return;
        }
        state.completedWeight = state.totalWeight;
        state.progress = 100;
        state.stage = "done";
        state.message = "completed";
        state.updatedAt = Instant.now();
        send(jobId, "done", "completed");
        close(jobId);
        states.remove(jobId);
    }

    public void fail(String jobId, String message) {
        if (jobId == null || jobId.isBlank()) {
            return;
        }
        ProgressState state = states.get(jobId);
        if (state == null) {
            return;
        }
        state.stage = "error";
        state.message = message == null ? "failed" : message;
        state.updatedAt = Instant.now();
        send(jobId, "error", state.message);
        close(jobId);
        states.remove(jobId);
    }

    public SseEmitter subscribe(String jobId) {
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT_MS);
        if (jobId == null || jobId.isBlank()) {
            emitter.complete();
            return emitter;
        }
        emitters.computeIfAbsent(jobId, key -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError((ex) -> removeEmitter(jobId, emitter));

        ProgressState state = states.get(jobId);
        try {
            if (state != null) {
                emitter.send(SseEmitter.event().name("progress").data(state.toPayload()));
            } else {
                emitter.send(SseEmitter.event().name("progress").data(Map.of(
                        "progress", 0,
                        "stage", "queued",
                        "message", "waiting",
                        "updatedAt", Instant.now().toString()
                )));
            }
        } catch (IOException ignored) {
        }
        return emitter;
    }

    private void send(String jobId, String stage, String message) {
        List<SseEmitter> list = emitters.get(jobId);
        if (list == null || list.isEmpty()) {
            return;
        }
        ProgressState state = states.get(jobId);
        if (state == null) {
            return;
        }
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name("progress").data(state.toPayload()));
            } catch (IOException ex) {
                removeEmitter(jobId, emitter);
            }
        }
    }

    private void close(String jobId) {
        List<SseEmitter> list = emitters.remove(jobId);
        if (list == null) {
            return;
        }
        for (SseEmitter emitter : list) {
            emitter.complete();
        }
    }

    private void removeEmitter(String jobId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(jobId);
        if (list == null) {
            return;
        }
        list.remove(emitter);
        if (list.isEmpty()) {
            emitters.remove(jobId);
        }
    }
}
