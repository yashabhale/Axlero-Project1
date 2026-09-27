package com.axelero.orderflow.config;

import io.aeron.Aeron;
import io.aeron.Publication;
import io.aeron.Subscription;
import io.aeron.driver.MediaDriver;
import io.aeron.driver.ThreadingMode;
import org.agrona.concurrent.UnsafeBuffer;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

@Configuration
@EnableConfigurationProperties(AeronProperties.class)
public class AeronConfig {

    public interface MessagePublisher {
        boolean publish(byte[] payload);
    }

    @Bean(destroyMethod = "close")
    public AeronRuntime aeronRuntime(AeronProperties properties) {
        MediaDriver driver = null;
        if (properties.isEmbeddedDriver()) {
            driver = MediaDriver.launchEmbedded(new MediaDriver.Context()
                    .threadingMode(ThreadingMode.SHARED)
                    .dirDeleteOnStart(true));
        }

        String aeronDir = properties.getDirectoryName();
        Aeron.Context context = new Aeron.Context();
        if (aeronDir != null && !aeronDir.isBlank()) {
            context.aeronDirectoryName(aeronDir);
        }
        if (driver != null) {
            context.aeronDirectoryName(driver.aeronDirectoryName());
        }

        return new AeronRuntime(driver, Aeron.connect(context));
    }

    @Bean
    public OrderPublisher orderPublisher(AeronRuntime aeronRuntime, AeronProperties properties) {
        return new OrderPublisher(aeronRuntime.aeron(), properties.getChannel(), properties.getStreamId());
    }

    @Bean(destroyMethod = "close")
    public OrderSubscriber orderSubscriber(AeronRuntime aeronRuntime, AeronProperties properties) {
        return new OrderSubscriber(aeronRuntime.aeron(), properties.getChannel(), properties.getStreamId());
    }

    public static final class AeronRuntime implements AutoCloseable {
        private final MediaDriver driver;
        private final Aeron aeron;

        private AeronRuntime(MediaDriver driver, Aeron aeron) {
            this.driver = driver;
            this.aeron = aeron;
        }

        public Aeron aeron() {
            return aeron;
        }

        @Override
        public void close() {
            if (aeron != null) {
                aeron.close();
            }
            if (driver != null) {
                driver.close();
            }
        }
    }

    public static final class OrderPublisher implements MessagePublisher {
        private final Publication publication;

        public OrderPublisher(Aeron aeron, String channel, int streamId) {
            this.publication = aeron.addPublication(channel, streamId);
        }

        public boolean publish(byte[] payload) {
            if (payload == null || payload.length == 0) {
                return false;
            }

            UnsafeBuffer buffer = new UnsafeBuffer(payload);
            long result = publication.offer(buffer, 0, payload.length);
            return result > 0;
        }

        public void close() {
            if (publication != null) {
                publication.close();
            }
        }
    }

    public static final class OrderSubscriber implements AutoCloseable {
        private final Subscription subscription;
        private final AtomicBoolean running = new AtomicBoolean(true);
        private final AtomicReference<String> lastMessage = new AtomicReference<>();
        private final Thread consumerThread;

        public OrderSubscriber(Aeron aeron, String channel, int streamId) {
            this.subscription = aeron.addSubscription(channel, streamId);
            this.consumerThread = new Thread(this::runLoop, "orderflow-aeron-consumer");
            this.consumerThread.setDaemon(true);
            this.consumerThread.start();
        }

        private void runLoop() {
            while (running.get()) {
                int fragments = subscription.poll((buffer, offset, length, header) -> {
                    byte[] bytes = new byte[length];
                    buffer.getBytes(offset, bytes);
                    lastMessage.set(new String(bytes, StandardCharsets.UTF_8));
                }, 10);

                if (fragments == 0) {
                    Thread.onSpinWait();
                }
            }
        }

        public String getLastMessage() {
            return lastMessage.get();
        }

        public void close() {
            running.set(false);
            if (consumerThread != null) {
                consumerThread.interrupt();
            }
            if (subscription != null) {
                subscription.close();
            }
        }
    }
}
